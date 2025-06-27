import type { PageLoad } from "./$types";
import { loadCompPageData } from "./loadCompPageData";

export const load: PageLoad = async (event) => {
  const compId = Number(event.params.compId);
  return await loadCompPageData(compId);
};
