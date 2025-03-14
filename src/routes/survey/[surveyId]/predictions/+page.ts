import { getDetailedSingleFields } from "$lib/field";
import { getPredictionsPerMatch, getPredictionsPerScout } from "$lib/prediction";
import { loadSurveyPageData } from "../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);

  if (data.surveyType != "match") {
    throw new Error("Survey type is not a match!");
  }

  const predictionsPerScout = getPredictionsPerScout(data.surveyRecord, data.entryRecords);
  const predictionsPerMatch = getPredictionsPerMatch(data.surveyRecord, data.entryRecords);

  return {
    ...data,
    fields,
    ...predictionsPerScout,
    predictionsPerMatch,
  };
};
