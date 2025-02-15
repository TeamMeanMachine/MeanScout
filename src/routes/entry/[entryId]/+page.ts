import type { PageLoad } from "./$types";
import { loadEntryPageData } from "./loadEntryPageData";

export const load: PageLoad = async (event) => {
  const entryId = Number(event.params.entryId);
  return await loadEntryPageData(entryId);
};
