import { loadSurveyPageData } from "../../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  return await loadSurveyPageData(surveyId);
};
