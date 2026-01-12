import { z } from "zod";
import {
  compareMatches,
  getTeamName,
  matchLevels,
  matchValueSchema,
  valueSchema,
  type Match,
  type MatchIdentifier,
} from "./";
import type { Comp } from "./comp";
import { getAllScouts } from "./prediction";
import { targets } from "./settings";
import type { Survey } from "./survey";

export const entryStatuses = ["draft", "submitted", "exported"] as const;
export type EntryStatus = (typeof entryStatuses)[number];

const tbaMetricsSchema = z.array(z.object({ name: z.string(), value: valueSchema }));
export type TbaMetrics = z.infer<typeof tbaMetricsSchema>;

const baseEntrySchema = z.object({
  id: z.string(),
  surveyId: z.string(),
  status: z.enum(entryStatuses),
  team: z.string(),
  values: z.array(valueSchema),
  scout: z.optional(z.string()),
  scoutTeam: z.optional(z.string()),
  created: z.date(),
  modified: z.date(),
});

const matchEntrySchema = z.object({
  ...baseEntrySchema.shape,
  type: z.literal("match"),
  match: matchValueSchema,
  matchSet: z.optional(matchValueSchema),
  matchLevel: z.optional(z.union(matchLevels.map((l) => z.literal(l)))),
  absent: z.boolean(),
  tbaMetrics: z.optional(tbaMetricsSchema),
  prediction: z.optional(z.literal("red").or(z.literal("blue"))),
  predictionReason: z.optional(z.string()),
});
export type MatchEntry = z.infer<typeof matchEntrySchema>;

const pitEntrySchema = z.object({
  ...baseEntrySchema.shape,
  type: z.literal("pit"),
});
export type PitEntry = z.infer<typeof pitEntrySchema>;

const entrySchema = z.discriminatedUnion("type", [matchEntrySchema, pitEntrySchema]);
export type Entry = z.infer<typeof entrySchema>;

export function getMatchEntriesByTeam(entries: MatchEntry[]) {
  const entriesByTeam: Record<string, MatchEntry[]> = {};
  for (const entry of entries) {
    if (entry.team in entriesByTeam) {
      entriesByTeam[entry.team].push(entry);
    } else {
      entriesByTeam[entry.team] = [entry];
    }
  }
  return entriesByTeam;
}

function compareEntryMatch(a: Entry, b: Entry) {
  if (a.type == "match" && b.type == "match") {
    return compareMatches(b, a);
  }

  if (a.type == "match" && b.type == "pit") {
    return -1;
  }

  if (a.type == "pit" && b.type == "match") {
    return 1;
  }

  return 0;
}

function getComparisons(a: Entry, b: Entry) {
  return {
    teamCompare: a.team.localeCompare(b.team, "en", { numeric: true }),
    matchCompare: compareEntryMatch(a, b),
    scoutCompare:
      a.scoutTeam?.localeCompare(b.scoutTeam || "", "en", { numeric: true }) ||
      a.scout?.localeCompare(b.scout || "") ||
      0,
  };
}

function compareMatchTeams(a: Entry, b: Entry, matches: Match[]) {
  if (a.type != "match" || b.type != "match") return 0;

  if (compareMatches(a, b) == 0) {
    const match = matches.find((m) => compareMatches(m, a) == 0);
    if (match) {
      const targets = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
      const targetA = targets.findIndex((t) => t == a.team);
      const targetB = targets.findIndex((t) => t == b.team);
      return targetA - targetB;
    }
  }

  return 0;
}

export function groupEntries(
  comp: Comp,
  surveys: Survey[],
  entries: Entry[],
  by: "status" | "survey" | "match" | "team" | "scout" | "target" | "absent",
) {
  const sortedEntries = entries.toSorted((a, b) => {
    const { teamCompare, matchCompare, scoutCompare } = getComparisons(a, b);

    switch (by) {
      case "status":
        return compareMatchTeams(a, b, comp.matches) || matchCompare || teamCompare || scoutCompare;
      case "survey":
        return compareMatchTeams(a, b, comp.matches) || matchCompare || teamCompare || scoutCompare;
      case "match":
        return teamCompare || matchCompare || scoutCompare;
      case "team":
        return compareMatchTeams(a, b, comp.matches) || matchCompare || teamCompare || scoutCompare;
      case "scout":
        return scoutCompare || matchCompare || teamCompare;
      case "target":
        return matchCompare || teamCompare || scoutCompare;
      case "absent":
        return matchCompare || teamCompare || scoutCompare;
      default:
        return 0;
    }
  });

  if (by == "status") {
    return {
      by: "status" as const,
      groups: entryStatuses
        .map((status) => {
          const entries = sortedEntries.filter((e) => e.status == status);
          if (entries.length) {
            return { status, entries };
          }
        })
        .filter((group) => group !== undefined),
    };
  }

  if (by == "survey") {
    return {
      by: "survey" as const,
      groups: surveys
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .map((survey) => {
          const entries = sortedEntries.filter((e) => e.surveyId == survey.id);
          if (entries.length) {
            return { surveyId: survey.id, entries };
          }
        })
        .filter((group) => group !== undefined),
    };
  }

  if (by == "team") {
    const teamSet = new Set(entries.map((entry) => entry.team));
    const teams = [...teamSet].toSorted((a, b) => a.localeCompare(b, "en", { numeric: true }));

    return {
      by: "team" as const,
      groups: teams
        .map((team) => {
          const entries = sortedEntries.filter((e) => e.team == team);
          if (entries.length) {
            return { team, teamName: getTeamName(team, comp.teams), entries };
          }
        })
        .filter((group) => group !== undefined),
    };
  }

  if (by == "match") {
    const matches: MatchIdentifier[] = [];

    for (const entry of entries) {
      if (entry.type != "match") continue;
      const entryIdentifier: MatchIdentifier = { number: entry.match, set: entry.matchSet, level: entry.matchLevel };
      if (!matches.some((m) => compareMatches(m, entryIdentifier) == 0)) {
        matches.push(entryIdentifier);
      }
    }

    return {
      by: "match" as const,
      groups: matches
        .toSorted((a, b) => compareMatches(b, a))
        .map((match) => {
          const entries = sortedEntries.filter((e) => e.type == "match" && compareMatches(match, e) == 0);
          if (entries.length) {
            return { match, entries };
          }
        })
        .filter((group) => group !== undefined),
    };
  }

  if (by == "scout") {
    const scouts = getAllScouts(comp, entries);
    scouts.push({ name: "" });
    scouts.sort((a, b) => a.team?.localeCompare(b.team || "", "en", { numeric: true }) || a.name.localeCompare(b.name));

    return {
      by: "scout" as const,
      groups: scouts
        .map((scout) => {
          const entries = sortedEntries.filter((e) => (e.scout || "") == scout.name && e.scoutTeam == scout.team);
          if (entries.length) {
            return { scout, entries };
          }
        })
        .filter((group) => group !== undefined),
    };
  }

  if (by == "target") {
    return {
      by: "target" as const,
      groups: targets
        .map((target) => {
          const entries = sortedEntries.filter((e) => {
            if (target == "pit" && e.type == "pit") {
              return true;
            }

            if (e.type != "match") return;

            const match = comp.matches.find((m) => compareMatches(m, e) == 0);
            if (!match) return;

            switch (target) {
              case "red 1":
                return e.team == match.red1;
              case "red 2":
                return e.team == match.red2;
              case "red 3":
                return e.team == match.red3;
              case "blue 1":
                return e.team == match.blue1;
              case "blue 2":
                return e.team == match.blue2;
              case "blue 3":
                return e.team == match.blue3;
            }
          });

          if (entries.length) {
            return { target, entries };
          }
        })
        .filter((group) => group !== undefined),
    };
  }

  if (by == "absent") {
    return {
      by: "absent" as const,
      groups: [true, false]
        .map((absent) => {
          const entries = sortedEntries.filter((e) => {
            if (e.type != "match") return;
            return e.absent == absent;
          });

          if (entries.length) {
            return { absent, entries };
          }
        })
        .filter((group) => group !== undefined),
    };
  }

  throw new Error("Unsupported param for 'by'");
}
