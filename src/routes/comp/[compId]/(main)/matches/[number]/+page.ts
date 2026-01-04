import { error } from "@sveltejs/kit";
import { compareMatches } from "$lib";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  if (!data.match) {
    error(
      404,
      `Match not found with number ${data.identifier.number}, level ${data.identifier.level}, set ${data.identifier.set}`,
    );
  }

  const redWon =
    data.match.redScore !== undefined &&
    data.match.blueScore !== undefined &&
    data.match.redScore > data.match.blueScore;
  const blueWon =
    data.match.redScore !== undefined &&
    data.match.blueScore !== undefined &&
    data.match.redScore < data.match.blueScore;

  // Matches should be in ascending order, so it's easy to find adjacent matches to this one.
  const nextMatch = data.matches.find((m) => compareMatches(data.match!, m) < 0);
  const previousMatch = data.matches.findLast((m) => compareMatches(data.match!, m) > 0);

  const hasExpressions = data.surveyRecords.some(
    (s) => s.type == "match" && s.expressions.some((e) => e.scope == "entry"),
  );

  let title: string;
  if (data.match.level && data.match.level != "qm") {
    title = "Match " + data.match.level + (data.match.set || 1) + "-" + data.match.number;
  } else {
    title = "Match " + data.match.number;
  }

  return {
    title,
    match: data.match,
    nextMatch,
    previousMatch,
    redWon,
    blueWon,
    hasExpressions,
  };
};
