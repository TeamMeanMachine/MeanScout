import { getMatchEntriesByTeam } from "$lib/entry";
import { loadSurveyPageData } from "$lib/loaders/loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await loadSurveyPageData(event.params.surveyId);
  if (data.surveyType != "match") {
    throw new Error("Survey type is not a match!");
  }
  return { ...data, entriesByTeam: getMatchEntriesByTeam(data.entryRecords) };
};
