import { getFieldsWithDetails } from "$lib/field";
import { idb } from "$lib/idb";
import type { SurveyPageData } from "$lib/survey";

export async function loadSurveyPageData(surveyId: number) {
  const surveyRecord = await idb.getOne({ from: "surveys", is: surveyId });
  const compRecord = await idb.getOne({ from: "comps", is: surveyRecord.compId });

  const entryRecords = await idb.getAll({ from: "entries", where: "surveyId", is: surveyId });
  const fieldRecords = await idb.getAll({ from: "fields", where: "surveyId", is: surveyId });

  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  localStorage.removeItem("comp");
  localStorage.setItem("survey", surveyRecord.id.toString());

  return {
    surveyType: surveyRecord.type,
    surveyRecord,
    compRecord,
    fieldRecords,
    entryRecords,
    fieldsWithDetails,
  } as SurveyPageData;
}
