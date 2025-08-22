import type { Comp } from "$lib/comp";
import type { Entry } from "$lib/entry";
import type { Field } from "$lib/field";
import { idb, type AllData } from "$lib/idb";
import type { Survey } from "$lib/survey";

export type CompPageData = {
  all: AllData;
  compRecord: Comp;
  surveyRecords: Survey[];
  fieldRecords: Field[];
  entryRecords: Entry[];
};

export async function loadCompPageData(compId: string): Promise<CompPageData> {
  const all = await idb.getAllAsync();

  const compRecord = all.comps.find((comp) => comp.id == compId);
  if (!compRecord) {
    throw new Error(`Comp record not found with id ${compId}`);
  }

  const surveyRecords = all.surveys.filter((survey) => survey.compId == compId);
  const surveyIds = surveyRecords.map((survey) => survey.id);

  const fieldRecords = all.fields.filter((field) => surveyIds.includes(field.surveyId));
  const entryRecords = all.entries.filter((entry) => surveyIds.includes(entry.surveyId));

  return {
    all,
    compRecord,
    surveyRecords,
    fieldRecords,
    entryRecords,
  };
}
