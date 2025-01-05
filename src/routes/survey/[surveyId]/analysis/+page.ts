import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const layoutData = await event.parent();
  if (layoutData.surveyType != "match") {
    throw new Error("Survey type is not a match!");
  }

  return layoutData;
};
