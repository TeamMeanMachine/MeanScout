import { getMatchEntriesByTeam } from "$lib/entry";
import { loadSurveyPageData } from "../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  if (data.surveyType != "match") {
    throw new Error("Survey type is not a match!");
  }
  return { ...data, entriesByTeam: getMatchEntriesByTeam(data.entryRecords) };
};
