import { getTeamName, type Team } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const teamsFromMatches = data.compRecord.matches
    .flatMap((match) => [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3])
    .filter((t) => t);

  const teamsFromEntries = data.entryRecords.map((e) => e.team);

  const teams = [
    ...new Set([...data.compRecord.teams.map((team) => team.number), ...teamsFromMatches, ...teamsFromEntries]),
  ]
    .map(
      (team: string): Team => ({
        number: team,
        name: getTeamName(team, data.compRecord.teams) || "",
      }),
    )
    .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));

  const team = teams.find((t) => t.number == event.params.number);

  if (!team) {
    error(404, `Team not found with number ${event.params.number}`);
  }

  sessionStorage.setItem("team-highlight", team.number);

  return { title: `Team ${team.number}`, teams, team, anyData: teamsFromEntries.includes(team.number) };
};
