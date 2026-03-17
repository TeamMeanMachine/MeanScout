import type { MatchEntry } from "$lib/entry";
import { getPredictionsPerMatch, getPredictionsPerScout } from "$lib/prediction";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const data = await event.parent();

  const entriesWithPredictions = data.entryRecords.filter(
    (e): e is MatchEntry => e.type == "match" && e.status != "draft" && e.prediction !== undefined,
  );

  const predictionsPerScout = getPredictionsPerScout(data.compRecord, entriesWithPredictions);
  const predictionsPerMatch = getPredictionsPerMatch(data.compRecord, entriesWithPredictions);

  const scoutName = event.params.name;
  const searchParams = new URLSearchParams(event.url.hash.split("?")[1]);
  const scoutTeam = searchParams.get("team") || undefined;

  return { title: "Scouts", scoutName, scoutTeam, entriesWithPredictions, ...predictionsPerScout, predictionsPerMatch };
};
