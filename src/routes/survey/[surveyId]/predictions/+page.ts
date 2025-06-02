import { getPredictionsPerMatch, getPredictionsPerScout } from "$lib/prediction";
import { loadSurveyPageData } from "../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);

  if (data.surveyType != "match") {
    throw new Error("Survey type is not a match!");
  }

  const predictionsPerScout = getPredictionsPerScout(data.surveyRecord, data.entryRecords);
  const predictionsPerMatch = getPredictionsPerMatch(data.surveyRecord, data.entryRecords);

  return {
    ...data,
    ...predictionsPerScout,
    predictionsPerMatch,
  };
};
