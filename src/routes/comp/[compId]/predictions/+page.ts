import { loadCompPageData } from "$lib/loaders/loadCompPageData";
import { getPredictionsPerMatch, getPredictionsPerScout } from "$lib/prediction";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await loadCompPageData(event.params.compId);

  const predictionsPerScout = getPredictionsPerScout(
    data.compRecord,
    data.entryRecords.filter((e) => e.type == "match"),
  );
  const predictionsPerMatch = getPredictionsPerMatch(
    data.compRecord,
    data.entryRecords.filter((e) => e.type == "match"),
  );

  return {
    ...data,
    ...predictionsPerScout,
    predictionsPerMatch,
  };
};
