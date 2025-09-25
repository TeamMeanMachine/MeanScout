import { getPredictionsPerMatch, getPredictionsPerScout } from "$lib/prediction";
import { error } from "@sveltejs/kit";
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

  const scout = event.params.scoutName;
  const scoutData = predictionsPerScout.predictionsPerScout.find((pps) => pps.scout == scout);

  if (!scoutData) {
    error(404, `Data for scout ${scout} not found`);
  }

  return { title: scout, ...scoutData, predictionsPerMatch };
};
