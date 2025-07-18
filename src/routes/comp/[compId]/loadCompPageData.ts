import type { CompPageData } from "$lib/comp";
import type { Entry } from "$lib/entry";
import type { Field } from "$lib/field";
import { idb } from "$lib/idb";

export async function loadCompPageData(compId: number) {
  const compRecord = await idb.getOne({ from: "comps", is: compId });
  const surveyRecords = await idb.getAll({ from: "surveys", where: "compId", is: compId });
  const fieldRecords: IDBRecord<Field>[] = [];
  const entryRecords: IDBRecord<Entry>[] = [];

  for (const surveyRecord of surveyRecords) {
    fieldRecords.push(...(await idb.getAll({ from: "fields", where: "surveyId", is: surveyRecord.id })));
    entryRecords.push(...(await idb.getAll({ from: "entries", where: "surveyId", is: surveyRecord.id })));
  }

  localStorage.setItem("comp", compId.toString());
  localStorage.removeItem("survey");

  return { compRecord, surveyRecords, fieldRecords, entryRecords } as CompPageData;
}
