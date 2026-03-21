import { error } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const compId = event.params.compId;

  const data = await event.parent();

  const compRecord = data.all.comps.find((comp) => comp.id == compId);
  if (!compRecord) {
    error(404, `Comp record not found with id ${compId}`);
  }

  const surveyRecords = data.all.surveys.filter((survey) => survey.compId == compId);
  const surveyIds = surveyRecords.map((survey) => survey.id);

  const fieldRecords = data.all.fields.filter((field) => surveyIds.includes(field.surveyId));
  const entryRecords = data.all.entries.filter((entry) => surveyIds.includes(entry.surveyId));

  if (!event.route.id.startsWith("/comp/[compId]/admin")) {
    sessionStorage.setItem("home", event.url.hash);
  }

  return {
    compRecord,
    surveyRecords,
    fieldRecords,
    entryRecords,
  };
};
