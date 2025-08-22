import { loadCompPageData } from "$lib/loaders/loadCompPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await loadCompPageData(event.params.compId);
  localStorage.setItem("home", event.url.hash);
  return data;
};
