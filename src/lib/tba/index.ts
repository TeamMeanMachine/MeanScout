import createClient, { type Middleware } from "openapi-fetch";
import { get } from "svelte/store";
import { parseValueFromString, type Team, type Value } from "../";
import type { Alliance, TeamsInsights } from "../comp";
import type { TbaMetrics } from "../entry";
import type { Match } from "../match";
import { tbaAuthKeyStore } from "../settings";
import type { paths } from "./schema";

const API_URL = "https://www.thebluealliance.com/api/v3";
const TBA_AUTH_KEY = "QucqT0im61Z50YQnCpSdkifFqo2aoTKkQRyQSjlM1juuhLu6kr7jXlHjJsfIO78B";

const client = createClient<paths>({ baseUrl: API_URL });
const middleware: Middleware = {
  onRequest({ request }) {
    request.headers.set("X-TBA-Auth-Key", get(tbaAuthKeyStore) || TBA_AUTH_KEY);
    return request;
  },
};
client.use(middleware);

export async function tbaAuthKeyIsValid(authKey: string) {
  const { data } = await client.GET("/status", { headers: [["X-TBA-Auth-Key", authKey]] });
  return data !== undefined;
}

export async function tbaEventExists(event_key: string) {
  const { data } = await client.GET("/event/{event_key}/simple", { params: { path: { event_key } } });
  return data !== undefined;
}

export async function tbaGetTeamEvents(team: string) {
  const team_key = `frc${parseInt(team)}`;
  const response = await client.GET("/team/{team_key}/events/simple", { params: { path: { team_key } } });

  if (response.data) {
    const lastYear = new Date().getFullYear() - 1;

    return {
      events: response.data
        .filter((event) => event.year >= lastYear)
        .map((event) => ({ name: `${event.year} ${event.name}`, key: event.key }))
        .toReversed(),
    };
  } else {
    return { error: `could not get events for team ${team}` };
  }
}

export async function tbaGetEventMatches(event_key: string) {
  const { data } = await client.GET("/event/{event_key}/matches", { params: { path: { event_key } } });

  if (data) {
    return data.map((match) => {
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
          .map(([name, value]) => ({ name: name.toLowerCase(), value: parseValueFromString(value) as Value }));

        const blueMetrics = Object.entries(match.score_breakdown.blue)
          .filter(([key]) => /robot[123]/gi.test(key))
          .map(([name, value]) => ({ name: name.toLowerCase(), value: parseValueFromString(value) as Value }));

        const redTeams = match.alliances.red.team_keys.map((key: string, index: number) => ({
          team: key.replace("frc", ""),
          tbaMetrics: teamBreakdownMetrics(redMetrics, index + 1),
        }));

        const blueTeams = match.alliances.blue.team_keys.map((key: string, index: number) => ({
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

export async function tbaGetEventTeams(event_key: string) {
  const { data } = await client.GET("/event/{event_key}/teams/simple", { params: { path: { event_key } } });

  if (data) {
    return data.map((team): Team => {
      return { number: team.key.replace("frc", ""), name: team.nickname };
    });
  }
}

export async function tbaGetEventAlliances(event_key: string) {
  const { data } = await client.GET("/event/{event_key}/alliances", { params: { path: { event_key } } });

  if (data) {
    return data.map((alliance): Alliance => {
      return { teams: alliance.picks.map((team) => team.replace("frc", "")) };
    });
  }
}

export async function tbaGetEventTeamInsights(event_key: string) {
  const [{ data: oprData }, { data: coprData }] = await Promise.all([
    client.GET("/event/{event_key}/oprs", { params: { path: { event_key } } }),
    client.GET("/event/{event_key}/coprs", { params: { path: { event_key } } }),
  ]);

  if (oprData && coprData) {
    const teamsInsights: TeamsInsights = { oprs: {}, dprs: {}, ccwms: {}, coprs: {} };

    if (oprData.oprs) {
      for (const frcTeam in oprData.oprs) {
        const team = frcTeam.replace("frc", "");
        const value = oprData.oprs[frcTeam];
        teamsInsights.oprs[team] = value;
      }
    }

    if (oprData.dprs) {
      for (const frcTeam in oprData.dprs) {
        const team = frcTeam.replace("frc", "");
        const value = oprData.dprs[frcTeam];
        teamsInsights.dprs[team] = value;
      }
    }

    if (oprData.ccwms) {
      for (const frcTeam in oprData.ccwms) {
        const team = frcTeam.replace("frc", "");
        const value = oprData.ccwms[frcTeam];
        teamsInsights.ccwms[team] = value;
      }
    }

    if (coprData) {
      for (const coprName in coprData) {
        const coprs = coprData[coprName];

        for (const frcTeam in coprs) {
          const team = frcTeam.replace("frc", "");
          const value = coprs[frcTeam];

          if (coprName in teamsInsights.coprs) {
            teamsInsights.coprs[coprName][team] = value;
          } else {
            teamsInsights.coprs[coprName] = { [team]: value };
          }
        }
      }
    }

    return teamsInsights;
  }
}

function teamBreakdownMetrics(metrics: TbaMetrics, robot: number) {
  return metrics
    .filter(({ name }) => name.toLowerCase().includes(`robot${robot}`))
    .map(({ name, value }) => ({ name: name.toLowerCase().replaceAll(/robot[123]/gi, ""), value }));
}
