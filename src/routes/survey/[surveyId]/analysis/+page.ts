import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  if (data.survey.type != "match") {
    error(400, `Survey type of ${data.survey.record.id} is not a match!`);
  }
  return {
    title: "Analysis",
    surveyRecord: data.survey.record,
    entryRecords: data.survey.entryRecords,
  };
};
