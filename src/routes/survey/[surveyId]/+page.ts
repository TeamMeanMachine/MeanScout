import type { PageLoad } from "./$types";
import { loadSurveyPageData } from "$lib/loaders/loadSurveyPageData";

export const load: PageLoad = async (event) => {
  return await loadSurveyPageData(event.params.surveyId);
};
