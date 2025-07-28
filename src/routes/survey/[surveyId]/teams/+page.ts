import { type Team } from "$lib";
import { loadSurveyPageData } from "$lib/loaders/loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await loadSurveyPageData(event.params.surveyId);

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

  return { ...data, teams };
};
