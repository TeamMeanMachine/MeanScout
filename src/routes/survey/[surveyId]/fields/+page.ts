import { loadSurveyPageData } from "$lib/loaders/loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await loadSurveyPageData(event.params.surveyId);
  return { ...data, disabled: data.entryRecords.length > 0 };
};
