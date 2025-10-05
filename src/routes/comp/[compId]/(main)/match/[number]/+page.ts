import type { Match } from "$lib";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const matches: (Match & { extraTeams?: string[] })[] = [...data.compRecord.matches];
  for (const entry of data.entryRecords) {
    if (entry.type == "match") {
      const existingMatch = matches.find((m) => m.number == entry.match);
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
          number: entry.match,
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
  }
  matches.sort((a, b) => a.number - b.number);

  const match = matches.find((m) => m.number.toString() == event.params.number);

  if (!match) {
    error(404, `Match not found with number ${event.params.number}`);
  }

  const redWon = match.redScore !== undefined && match.blueScore !== undefined && match.redScore > match.blueScore;
  const blueWon = match.redScore !== undefined && match.blueScore !== undefined && match.redScore < match.blueScore;

  const nextMatch = matches.find((m) => m.number > match.number);
  const previousMatch = matches.findLast((m) => m.number < match.number);

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
