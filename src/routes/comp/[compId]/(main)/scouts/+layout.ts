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

  const scoutName = event.params.name;
  const searchParams = new URLSearchParams(event.url.hash.split("?")[1]);
  const scoutTeam = searchParams.get("team") || undefined;

  return { title: "Scouts", scoutName, scoutTeam, ...predictionsPerScout, predictionsPerMatch };
};
