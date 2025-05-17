import { getMatchEntriesByTeam } from "$lib/entry";
import { getFieldsWithDetails } from "$lib/field";
import { loadSurveyPageData } from "../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  if (data.surveyType != "match") {
    throw new Error("Survey type is not a match!");
  }
  const fieldsWithDetails = getFieldsWithDetails(data.surveyRecord, data.fieldRecords);
  const entriesByTeam = getMatchEntriesByTeam(data.entryRecords);
  return { ...data, fieldsWithDetails, entriesByTeam };
};
