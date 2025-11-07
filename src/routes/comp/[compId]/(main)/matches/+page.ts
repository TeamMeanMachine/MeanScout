import { getAllMatches } from "$lib";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  return { title: "Matches", ...getAllMatches(data.compRecord, data.entryRecords) };
};
