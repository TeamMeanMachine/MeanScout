import { loadEntryPageData } from "$lib/loaders/loadEntryPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  return await loadEntryPageData(event.params.entryId);
};
