import { loadCompPageData } from "../../loadCompPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const compId = Number(event.params.compId);
  return await loadCompPageData(compId);
};
