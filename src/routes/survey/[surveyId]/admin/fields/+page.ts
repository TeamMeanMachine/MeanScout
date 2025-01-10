import { loadSurveyPageData } from "../../loadSurveyPageData";
import type { PageLoad } from "./$types";
import { getDetailedSingleFields } from "$lib/field";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);
  return { ...data, fields };
};
