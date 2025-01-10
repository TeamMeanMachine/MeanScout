import { loadSurveyPageData } from "../../loadSurveyPageData";
import type { PageLoad } from "./$types";
import { getDetailedSingleFields } from "$lib/field";
import type { MatchEntry } from "$lib/entry";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  if (data.surveyType != "match") {
    throw new Error("Survey type is not a match!");
  }
  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);
  const entriesByTeam: Record<string, IDBRecord<MatchEntry>[]> = {};
  for (const entry of data.entryRecords) {
    if (entry.team in entriesByTeam) {
      entriesByTeam[entry.team] = [...entriesByTeam[entry.team], entry];
    } else {
      entriesByTeam[entry.team] = [entry];
    }
  }
  return { ...data, fields, entriesByTeam };
};
