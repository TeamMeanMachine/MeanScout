import type { MatchEntry } from "$lib/entry";
import { loadCompPageData } from "$lib/loaders/loadCompPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await loadCompPageData(event.params.compId);
  localStorage.setItem("home", event.url.hash);
  const lastCompletedMatch = Math.max(
    ...data.entryRecords.filter((e): e is MatchEntry => e.type == "match" && e.status != "draft").map((e) => e.match),
    0,
  );
  return { ...data, lastCompletedMatch };
};
