import { getTeamName, type Team } from "$lib";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const teamsFromMatches = data.compRecord.matches.flatMap((match) => [
    match.red1,
    match.red2,
    match.red3,
    match.blue1,
    match.blue2,
    match.blue3,
  ]);

  const teams = [...new Set([...data.compRecord.teams.map((team) => team.number), ...teamsFromMatches])]
    .map(
      (team: string): Team => ({
        number: team,
        name: getTeamName(team, data.compRecord.teams) || "",
      }),
    )
    .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));

  const hasExpressions = data.surveyRecords.some(
    (s) => s.type == "match" && s.expressions.some((e) => e.scope == "entry"),
  );

  return { title: "Teams", teams, hasExpressions };
};
