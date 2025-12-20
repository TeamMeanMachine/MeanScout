import { compareMatches, getAllMatches, matchLevels, type MatchIdentifier, type MatchLevel } from "$lib";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const data = await event.parent();
  const searchParams = new URLSearchParams(event.url.hash.split("?")[1]);

  let level = searchParams.get("level") as MatchLevel;
  if (!matchLevels.includes(level)) {
    level = "qm";
  }

  let set = Number(searchParams.get("set"));
  if (!Number.isInteger(set) || set < 1) {
    set = 1;
  }

  const { matches, lastCompletedMatch } = getAllMatches(data.compRecord, data.entryRecords);
  const identifier: MatchIdentifier = { number: Number(event.params.number), level, set };
  const match = matches.find((m) => compareMatches(m, identifier) == 0);

  return {
    title: "Matches",
    identifier,
    matches,
    match,
    lastCompletedMatch,
  };
};
