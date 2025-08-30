import { getPredictionsPerMatch, getPredictionsPerScout } from "$lib/prediction";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const predictionsPerScout = getPredictionsPerScout(
    data.compRecord,
    data.entryRecords.filter((e) => e.type == "match"),
  );
  const predictionsPerMatch = getPredictionsPerMatch(
    data.compRecord,
    data.entryRecords.filter((e) => e.type == "match"),
  );

  return { title: "Predictions", ...predictionsPerScout, predictionsPerMatch };
};
