import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const data = await event.parent();

  const teamsFromEntries = data.entryRecords.map((e) => e.team);
  const teamNumbersFromStuff = [
    ...new Set([
      ...teamsFromEntries,
      ...data.compRecord.matches
        .flatMap((match) => [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3])
        .filter((t) => t),
      ...(data.compRecord.alliances?.flatMap((a) => a.teams) || []),
    ]),
  ];

  const teams = structuredClone(data.compRecord.teams);
  const unrecognizedTeams = new Set<string>();
  for (const teamNumber of teamNumbersFromStuff) {
    if (!teams.some((t) => t.number == teamNumber)) {
      teams.push({
        number: teamNumber,
        name: teams.find((t) => parseInt(t.number) == parseInt(teamNumber))?.name || "",
      });
      unrecognizedTeams.add(teamNumber);
    }
  }

  teams.sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));

  const team = teams.find((t) => t.number == event.params.number);

  return {
    title: "Teams",
    teams,
    unrecognizedTeams,
    teamsFromEntries,
    team,
  };
};
