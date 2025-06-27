import type { EntryPageData } from "$lib/entry";
import { getDefaultFieldValue, getFieldsWithDetails } from "$lib/field";
import { idb } from "$lib/idb";

export async function loadEntryPageData(entryId: number) {
  const entryRecord = await idb.getOne({ from: "entries", is: entryId });
  const surveyRecord = await idb.getOne({ from: "surveys", is: entryRecord.surveyId });
  const compRecord = await idb.getOne({ from: "comps", is: surveyRecord.compId });
  const fieldRecords = await idb.getAll({ from: "fields", where: "surveyId", is: surveyRecord.id });

  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);
  const defaultValues = fieldsWithDetails.orderedSingle.map((field) => getDefaultFieldValue(field.field));
  const teamName = compRecord.teams.find((t) => t.number == entryRecord.team)?.name;

  localStorage.removeItem("comp");
  localStorage.setItem("survey", surveyRecord.id.toString());

  return {
    surveyType: surveyRecord.type,
    entryRecord,
    surveyRecord,
    compRecord,
    fieldsWithDetails,
    defaultValues,
    teamName,
  } as EntryPageData;
}
