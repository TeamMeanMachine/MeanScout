import { compareMatches, getAllMatches, matchLevels, type MatchIdentifier, type MatchLevel } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const { matches } = getAllMatches(data.compRecord, data.entryRecords);

  const searchParams = new URLSearchParams(event.url.hash.split("?")[1]);

  let level = searchParams.get("level") as MatchLevel;
  if (!matchLevels.includes(level)) {
    level = "qm";
  }

  let set = Number(searchParams.get("set"));
  if (!Number.isInteger(set) || set < 1) {
    set = 1;
  }

  const identifier: MatchIdentifier = { number: Number(event.params.number), level, set };

  const match = matches.find((m) => compareMatches(m, identifier) == 0);

  if (!match) {
    error(404, `Match not found with number ${identifier.number}, level ${identifier.level}, set ${identifier.set}`);
  }

  const redWon = match.redScore !== undefined && match.blueScore !== undefined && match.redScore > match.blueScore;
  const blueWon = match.redScore !== undefined && match.blueScore !== undefined && match.redScore < match.blueScore;

  // Matches should be in ascending order, so it's easy to find adjacent matches to this one.
  const nextMatch = matches.find((m) => compareMatches(match, m) < 0);
  const previousMatch = matches.findLast((m) => compareMatches(match, m) > 0);

  const hasExpressions = data.surveyRecords.some(
    (s) => s.type == "match" && s.expressions.some((e) => e.scope == "entry"),
  );

  let title: string;
  if (match.level && match.level != "qm") {
    title = "Match " + match.level + (match.set || 1) + "-" + match.number;
  } else {
    title = "Match " + match.number;
  }

  return {
    title,
    match,
    nextMatch,
    previousMatch,
    redWon,
    blueWon,
    hasExpressions,
  };
};
