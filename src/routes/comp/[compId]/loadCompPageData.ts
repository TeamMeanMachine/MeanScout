import type { CompPageData } from "$lib/comp";
import { idb } from "$lib/idb";

export async function loadCompPageData(compId: number) {
  const compRecord = await idb.getOne({ from: "comps", is: compId });
  const surveyRecords = await idb.getAll({ from: "surveys", where: "compId", is: compId });

  localStorage.setItem("comp", compId.toString());
  localStorage.removeItem("survey");

  return { compRecord, surveyRecords } as CompPageData;
}
