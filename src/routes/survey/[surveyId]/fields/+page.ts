import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  return { title: "Fields", disabled: data.survey.entryRecords.length > 0 };
};
