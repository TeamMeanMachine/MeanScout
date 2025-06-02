import { loadSurveyPageData } from "../../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  return { ...data, disabled: data.entryRecords.length > 0 };
};
