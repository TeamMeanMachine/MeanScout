import { idb } from "$lib/idb";
import { error } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const compId = event.params.compId;

  const all = await idb.getAllAsync();

  const compRecord = all.comps.find((comp) => comp.id == compId);
  if (!compRecord) {
    error(404, `Comp record not found with id ${compId}`);
  }

  const surveyRecords = all.surveys.filter((survey) => survey.compId == compId);
  const surveyIds = surveyRecords.map((survey) => survey.id);

  const fieldRecords = all.fields.filter((field) => surveyIds.includes(field.surveyId));
  const entryRecords = all.entries.filter((entry) => surveyIds.includes(entry.surveyId));

  if (!event.url.hash.includes("/admin")) {
    localStorage.setItem("home", event.url.hash);
  }

  return { compRecord, surveyRecords, fieldRecords, entryRecords };
};
