import { loadSurveyPageData } from "./loadSurveyPageData";
import type { PageLoad } from "./$types";
import { idb } from "$lib/idb";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);

  const surveyRecords = await idb.getAll({ from: "surveys" });
  const compRecords = await idb.getAll({ from: "comps" });

  return {
    ...data,
    otherSurveys: surveyRecords.filter((s) => s.id !== surveyId && s.compId == data.compRecord.id),
    otherComps: compRecords.filter((c) => c.id !== data.compRecord.id),
  };
};
