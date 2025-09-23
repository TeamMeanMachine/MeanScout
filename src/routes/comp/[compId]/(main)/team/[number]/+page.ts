import { type Team } from "$lib";
import { error } from "@sveltejs/kit";
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
        name: data.compRecord.teams.find((t) => t.number == team)?.name || "",
      }),
    )
    .filter((team) => data.entryRecords.some((e) => e.team == team.number))
    .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));

  const team = teams.find((t) => t.number == event.params.number);

  if (!team) {
    error(404, `Team not found with number ${event.params.number}`);
  }

  const hasExpressions = data.surveyRecords.some(
    (s) => s.type == "match" && s.expressions.some((e) => e.scope == "entry"),
  );

  sessionStorage.setItem("team-highlight", team.number);

  return { title: `Team ${team.number}`, teams, team, hasExpressions };
};
