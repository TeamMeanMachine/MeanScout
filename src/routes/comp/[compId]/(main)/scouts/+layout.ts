import { getPredictionsPerMatch, getPredictionsPerScout } from "$lib/prediction";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const data = await event.parent();

  const predictionsPerScout = getPredictionsPerScout(
    data.compRecord,
    data.entryRecords.filter((e) => e.type == "match"),
  );
  const predictionsPerMatch = getPredictionsPerMatch(
    data.compRecord,
    data.entryRecords.filter((e) => e.type == "match"),
  );

  const scout = event.params.name;

  return { title: "Scouts", scout, ...predictionsPerScout, predictionsPerMatch };
};
