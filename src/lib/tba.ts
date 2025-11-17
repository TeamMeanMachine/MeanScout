import { get } from "svelte/store";
import { parseValueFromString, type Match, type Team, type Value } from "./";
import { tbaAuthKeyStore } from "./settings";
import type { TbaMetrics } from "./entry";
import type { Alliance } from "./comp";

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
  const response = await tbaFetch(`/event/${eventKey}/matches`);

  if (response.status == "success" && Array.isArray(response.data)) {
    return response.data.map((match) => {
      const newMatch: Match = {
        number: match.match_number,
        red1: match.alliances.red.team_keys[0]?.replace("frc", "") || "",
        red2: match.alliances.red.team_keys[1]?.replace("frc", "") || "",
        red3: match.alliances.red.team_keys[2]?.replace("frc", "") || "",
        blue1: match.alliances.blue.team_keys[0]?.replace("frc", "") || "",
        blue2: match.alliances.blue.team_keys[1]?.replace("frc", "") || "",
        blue3: match.alliances.blue.team_keys[2]?.replace("frc", "") || "",
      };

      if (match.set_number != 1) {
        newMatch.set = match.set_number;
      }

      if (match.comp_level != "qm") {
        newMatch.level = match.comp_level;
      }

      const redScore = Number(match.alliances.red.score);
      const blueScore = Number(match.alliances.blue.score);

      if (redScore > -1 && blueScore > -1) {
        newMatch.redScore = redScore;
        newMatch.blueScore = blueScore;
      }

      if (match.score_breakdown) {
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
          match: newMatch,
          breakdowns: [...redTeams, ...blueTeams],
        };
      }

      return { match: newMatch, breakdowns: undefined };
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

export async function tbaGetEventAlliances(eventKey: string) {
  const response = await tbaFetch(`/event/${eventKey}/alliances`);

  if (response.status == "success" && Array.isArray(response.data)) {
    return response.data.map((alliance): Alliance => {
      return { teams: (alliance.picks as string[]).map((team) => team.replace("frc", "")) };
    });
  }
}

function teamBreakdownMetrics(metrics: TbaMetrics, robot: number) {
  return metrics
    .filter(({ name }) => name.toLowerCase().includes(`robot${robot}`))
    .map(({ name, value }) => ({ name: name.toLowerCase().replaceAll(/robot[123]/gi, ""), value }));
}
