import { getMatchEntriesByTeam } from "$lib/entry";
import { getDetailedSingleFields } from "$lib/field";
import { loadSurveyPageData } from "../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  if (data.surveyType != "match") {
    throw new Error("Survey type is not a match!");
  }
  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);
  const entriesByTeam = getMatchEntriesByTeam(data.entryRecords);
  return { ...data, fields, entriesByTeam };
};
