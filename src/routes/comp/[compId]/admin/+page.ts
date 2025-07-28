import { loadCompPageData } from "$lib/loaders/loadCompPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  return await loadCompPageData(event.params.compId);
};
