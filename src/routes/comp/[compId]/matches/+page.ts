import type { Match } from "$lib";
import type { MatchEntry } from "$lib/entry";
import { loadCompPageData } from "$lib/loaders/loadCompPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await loadCompPageData(event.params.compId);
  localStorage.setItem("home", event.url.hash);

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

  const lastCompletedMatch = Math.max(
    ...data.entryRecords.filter((e): e is MatchEntry => e.type == "match" && e.status != "draft").map((e) => e.match),
    0,
  );

  const hasExpressions = data.surveyRecords.some(
    (s) => s.type == "match" && s.expressions.some((e) => e.scope == "entry"),
  );

  return { ...data, matches, lastCompletedMatch, hasExpressions };
};
