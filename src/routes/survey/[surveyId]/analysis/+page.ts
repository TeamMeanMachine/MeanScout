import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  if (data.survey.type != "match") {
    throw new Error("Survey type is not a match!");
  }
  return {
    title: "Analysis",
    surveyRecord: data.survey.record,
    entryRecords: data.survey.entryRecords,
  };
};
