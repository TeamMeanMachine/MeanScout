import { loadSurveyPageData } from "$lib/loaders/loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  return await loadSurveyPageData(event.params.surveyId);
};
