import type { Team } from "$lib";
import type { Entry } from "$lib/entry";
import { getFieldsWithDetails } from "$lib/field";
import { loadSurveyPageData } from "../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  const fieldsWithDetails = getFieldsWithDetails(data.surveyRecord, data.fieldRecords);

  const entriesByTeam: Record<string, IDBRecord<Entry>[]> = {};
  for (const entry of data.entryRecords) {
    if (entry.team in entriesByTeam) {
      entriesByTeam[entry.team].push(entry);
    } else {
      entriesByTeam[entry.team] = [entry];
    }
  }

  const teamsFromMatches = data.surveyRecord.matches.flatMap((match) => [
    match.red1,
    match.red2,
    match.red3,
    match.blue1,
    match.blue2,
    match.blue3,
  ]);

  const teams = [...new Set([...data.surveyRecord.teams.map((team) => team.number), ...teamsFromMatches])]
    .map(
      (team: string): Team => ({
        number: team,
        name: data.surveyRecord.teams.find((t) => t.number == team)?.name || "",
      }),
    )
    .filter((team) => entriesByTeam[team.number]?.length)
    .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));

  return { ...data, fieldsWithDetails, teams, entriesByTeam };
};
