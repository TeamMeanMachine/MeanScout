import { z } from "zod";
import { teamStore } from "./settings";
import { get, writable } from "svelte/store";
import { browser } from "$app/environment";
import type { Comp } from "./comp";
import type { Entry } from "./entry";

export const schemaVersion = 16;

export const valueSchema = z.string().or(z.number()).or(z.boolean());
export type Value = z.infer<typeof valueSchema>;

export const matchValueSchema = z.number().int().gt(0);

export const matchLevels = ["qm", "ef", "qf", "sf", "f"] as const;
export type MatchLevel = (typeof matchLevels)[number];

export const matchIdentifierSchema = z.object({
  number: matchValueSchema,
  set: z.optional(matchValueSchema),
  level: z.optional(z.union(matchLevels.map((l) => z.literal(l)))),
});

export type MatchIdentifier = z.infer<typeof matchIdentifierSchema>;

export const matchSchema = z.object({
  ...matchIdentifierSchema.shape,
  red1: z.string(),
  red2: z.string(),
  red3: z.string(),
  blue1: z.string(),
  blue2: z.string(),
  blue3: z.string(),
  redScore: z.optional(z.number()),
  blueScore: z.optional(z.number()),
});
export type Match = z.infer<typeof matchSchema>;

type EntryMatchIdentifier = {
  match: number;
  matchSet?: number | undefined;
  matchLevel?: MatchLevel | undefined;
};

/**
  Ascending comparison. Returns:
  - 0, if matches share identifiers
  - less than 0, if match a is BEFORE match b
  - greater than 0, if match a is AFTER match b
 */
export function compareMatches(
  a: MatchIdentifier | EntryMatchIdentifier | number,
  b: MatchIdentifier | EntryMatchIdentifier | number,
) {
  let aTransformed: MatchIdentifier;
  let bTransformed: MatchIdentifier;

  if (typeof a == "number") {
    aTransformed = { number: a };
  } else if ("match" in a) {
    aTransformed = { number: a.match, set: a.matchSet, level: a.matchLevel };
  } else {
    aTransformed = a;
  }

  if (typeof b == "number") {
    bTransformed = { number: b };
  } else if ("match" in b) {
    bTransformed = { number: b.match, set: b.matchSet, level: b.matchLevel };
  } else {
    bTransformed = b;
  }

  return (
    matchLevels.indexOf(aTransformed.level || "qm") - matchLevels.indexOf(bTransformed.level || "qm") ||
    (aTransformed.set || 1) - (bTransformed.set || 1) ||
    aTransformed.number - bTransformed.number
  );
}

export function getMatchTeamFontWeight(team: string) {
  const teamStoreValue = get(teamStore);
  if (!teamStoreValue) return "";
  if (team == teamStoreValue) return "font-bold underline";
  return "font-light";
}

export function matchUrl(match: MatchIdentifier, compId: string) {
  const describeLevel = match.level && match.level != "qm";
  const describeSet = match.set && match.set != 1;

  if (!describeLevel && !describeSet) {
    return `comp/${compId}/match/${match.number}`;
  } else if (describeLevel && !describeSet) {
    return `comp/${compId}/match/${match.number}?level=${match.level}`;
  } else if (!describeLevel && describeSet) {
    return `comp/${compId}/match/${match.number}?set=${match.set}`;
  } else {
    return `comp/${compId}/match/${match.number}?level=${match.level}&set=${match.set}`;
  }
}

export function getAllMatches(comp: Comp, entries: Entry[]) {
  const matches: (Match & { extraTeams?: string[] })[] = [...comp.matches];

  let lastCompletedMatch: MatchIdentifier | undefined = undefined;

  for (const entry of entries) {
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

  return { matches, lastCompletedMatch };
}

export const teamSchema = z.object({ number: z.string(), name: z.string() });
export type Team = z.infer<typeof teamSchema>;

export function isValidTeam(team: string) {
  return /^\d{1,5}[A-Z]?$/.test(team);
}

export const allianceTeamLabels = ["Captain", "1st Pick", "2nd Pick"];

export function parseValueFromString(value: any) {
  if (typeof value !== "string") return value;

  if (value.toLowerCase() == "true") {
    return true;
  } else if (value.toLowerCase() == "false") {
    return false;
  } else if (value == "") {
    return "";
  } else if (!Number.isNaN(Number(value))) {
    return Number(value);
  }

  return value;
}

export function sessionStorageStore<T extends string>(key: string, defaultValue: T) {
  const value = browser ? ((sessionStorage.getItem(key) as T) ?? defaultValue) : defaultValue;
  const store = writable<T>(value);
  store.subscribe((val) => browser && sessionStorage.setItem(key, val));
  return store;
}

export function download(data: string, name: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.download = name;
  anchor.href = url;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function share(data: string, name: string, type: string) {
  const file = new File([data], name, { type });
  navigator.share({ files: [file], title: file.name });
}

export function getOrdinal(n: number) {
  if (n % 10 == 1 && n % 100 != 11) return "st";
  if (n % 10 == 2 && n % 100 != 12) return "nd";
  if (n % 10 == 3 && n % 100 != 13) return "rd";
  return "th";
}
