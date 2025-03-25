import { get } from "svelte/store";
import { parseValueFromString, type Match, type Team, type Value } from "./";
import { tbaAuthKeyStore } from "./settings";
import type { TbaMetrics } from "./entry";

const API_URL = "https://www.thebluealliance.com/api/v3";
const TBA_AUTH_KEY = "bLFDfOniJOVOziESwbhPHncaUu30iIj64I2IMIOg4FLeNE0D3LGgkWslxugJKFlL";

export async function tbaFetch(endpoint: string, authKey = get(tbaAuthKeyStore) || TBA_AUTH_KEY) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: [["X-TBA-Auth-Key", authKey]],
  });

  const data = await response.json();

  if (response.status == 200) {
    return { status: "success" as const, data };
  } else if (response.status == 401) {
    return { status: "unauthorized" as const, error: data.Error };
  } else if (response.status == 404) {
    return { status: "not found" as const };
  } else {
    return { status: "error" as const };
  }
}

export async function tbaAuthKeyIsValid(authKey: string) {
  const response = await tbaFetch("/status", authKey);
  return response.status == "success";
}

export async function tbaEventExists(eventKey: string) {
  const response = await tbaFetch(`/event/${eventKey}/simple`);
  return response.status == "success";
}

export async function tbaGetTeamEvents(team: string) {
  const response = await tbaFetch(`/team/frc${team}/events/simple`);

  if (response.status == "success" && Array.isArray(response.data)) {
    const lastYear = new Date().getFullYear() - 1;

    return {
      events: response.data
        .filter((event) => event.year >= lastYear)
        .map((event) => ({ name: `${event.year} ${event.name}`, key: event.key }))
        .reverse(),
    };
  } else {
    return { error: `could not get events for team ${team}` };
  }
}

export async function tbaGetEventMatches(eventKey: string) {
  const response = await tbaFetch(`/event/${eventKey}/matches/simple`);

  if (response.status == "success" && Array.isArray(response.data)) {
    return response.data
      .filter((match) => match.comp_level == "qm")
      .map((match): Match => {
        const newMatch: Match = {
          number: match.match_number,
          red1: match.alliances.red.team_keys[0].replace("frc", ""),
          red2: match.alliances.red.team_keys[1].replace("frc", ""),
          red3: match.alliances.red.team_keys[2].replace("frc", ""),
          blue1: match.alliances.blue.team_keys[0].replace("frc", ""),
          blue2: match.alliances.blue.team_keys[1].replace("frc", ""),
          blue3: match.alliances.blue.team_keys[2].replace("frc", ""),
        };

        const redScore = Number(match.alliances.red.score);
        const blueScore = Number(match.alliances.blue.score);

        if (redScore > -1 && blueScore > -1) {
          newMatch.redScore = redScore;
          newMatch.blueScore = blueScore;
        }

        return newMatch;
      });
  }
}

export async function tbaGetEventTeams(eventKey: string) {
  const response = await tbaFetch(`/event/${eventKey}/teams/simple`);

  if (response.status == "success" && Array.isArray(response.data)) {
    return response.data.map((team): Team => {
      return { number: team.key.replace("frc", ""), name: team.nickname };
    });
  }
}

function teamBreakdownMetrics(metrics: TbaMetrics, robot: number) {
  return metrics
    .filter(({ name }) => name.toLowerCase().includes(`robot${robot}`))
    .map(({ name, value }) => ({ name: name.replaceAll(/robot[123]/gi, ""), value }));
}

export async function tbaGetMatchScoreBreakdowns(eventKey: string) {
  const response = await tbaFetch(`/event/${eventKey}/matches`);

  if (response.status == "success" && Array.isArray(response.data)) {
    return response.data
      .filter((match) => match.comp_level == "qm")
      .map((match) => {
        const redMetrics = Object.entries(match.score_breakdown.red)
          .filter(([key]) => /robot[123]/gi.test(key))
          .map(([name, value]) => ({ name, value: parseValueFromString(value) as Value }));

        const blueMetrics = Object.entries(match.score_breakdown.blue)
          .filter(([key]) => /robot[123]/gi.test(key))
          .map(([name, value]) => ({ name, value: parseValueFromString(value) as Value }));

        const redTeams = (match.alliances.red.team_keys as string[]).map((key: string, index: number) => ({
          team: key.replace("frc", ""),
          tbaMetrics: teamBreakdownMetrics(redMetrics, index + 1),
        }));

        const blueTeams = (match.alliances.blue.team_keys as string[]).map((key: string, index: number) => ({
          team: key.replace("frc", ""),
          tbaMetrics: teamBreakdownMetrics(blueMetrics, index + 1),
        }));

        return {
          match: Number(match.match_number),
          teams: [...redTeams, ...blueTeams],
        };
      });
  }
}
