import type { LayoutLoad } from "./$types";
import { getTeamNameMap } from "#lib";

export const load: LayoutLoad = async (event) => {
  const data = await event.parent();

  const teams = structuredClone(data.compRecord.teams);

  const remaps = new Map<string, string>();
  for (const team of teams) {
    if (team.remap) remaps.set(team.number, team.remap);
  }

  const teamNameMap = getTeamNameMap(teams);

  const teamsFromEntries = data.entryRecords.map((e) => remaps.get(e.team) || e.team);

  const teamNumbersFromStuff = [
    ...new Set([
      ...teamsFromEntries,
      ...data.compRecord.matches
        .flatMap((match) => [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3])
        .filter((t) => t),
      ...(data.compRecord.alliances?.flatMap((a) => a.teams) || []),
    ]),
  ];

  for (const teamNumber of teamNumbersFromStuff) {
    if (!teams.some((t) => (t.remap || t.number) == teamNumber)) {
      teams.push({ number: teamNumber, name: teamNameMap.get(teamNumber) || "" });
    }
  }

  teams.sort((a, b) => (a.remap || a.number).localeCompare(b.remap || b.number, "en", { numeric: true }));

  const team = teams.find((t) => (t.remap || t.number) == event.params.number);

  return {
    title: "Teams",
    teams,
    teamNameMap,
    teamsFromEntries,
    team,
  };
};
