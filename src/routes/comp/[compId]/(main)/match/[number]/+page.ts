import { compareMatches, matchLevels, type Match, type MatchIdentifier, type MatchLevel } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const matches: (Match & { extraTeams?: string[] })[] = [...data.compRecord.matches];

  for (const entry of data.entryRecords) {
    if (entry.type != "match" || entry.status == "draft") continue;

    const entryMatchIdentifiers = { number: entry.match, set: entry.matchSet, level: entry.matchLevel };
    const existingMatch = matches.find((m) => compareMatches(m, entryMatchIdentifiers) == 0);

    if (existingMatch) {
      const teams = [
        existingMatch.red1,
        existingMatch.red2,
        existingMatch.red3,
        existingMatch.blue1,
        existingMatch.blue2,
        existingMatch.blue3,
        ...(existingMatch.extraTeams || []),
      ];

      if (!teams.includes(entry.team)) {
        existingMatch.extraTeams = [...(existingMatch.extraTeams || []), entry.team].toSorted((a, b) =>
          a.localeCompare(b),
        );
      }
    } else {
      matches.push({
        ...entryMatchIdentifiers,
        red1: "",
        red2: "",
        red3: "",
        blue1: "",
        blue2: "",
        blue3: "",
        extraTeams: [entry.team],
      });
    }
  }

  matches.sort(compareMatches);

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

  return {
    title: `Match ${match.number}`,
    match,
    nextMatch,
    previousMatch,
    redWon,
    blueWon,
    hasExpressions,
  };
};
