import { compareMatches, type Match, type MatchIdentifier } from "$lib";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const matches: (Match & { extraTeams?: string[] })[] = [...data.compRecord.matches];

  let lastCompletedMatch: MatchIdentifier | undefined = undefined;

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

    if (!lastCompletedMatch || compareMatches(entryMatchIdentifiers, lastCompletedMatch) > 0) {
      lastCompletedMatch = entryMatchIdentifiers;
    }
  }

  matches.sort(compareMatches);

  return { title: "Matches", matches, lastCompletedMatch };
};
