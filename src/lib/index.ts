import { z } from "zod";
import { teamStore } from "./settings";
import { get, writable } from "svelte/store";
import { browser } from "$app/environment";

export const schemaVersion = 16;

export const valueSchema = z.string().or(z.number()).or(z.boolean());
export type Value = z.infer<typeof valueSchema>;

export const matchValueSchema = z.number().int().gt(0);

export const matchLevels = ["qm", "ef", "qf", "sf", "f"] as const;
export type MatchLevel = (typeof matchLevels)[number];

const matchIdentifier = z.object({
  number: matchValueSchema,
  set: z.optional(matchValueSchema),
  level: z.optional(z.union(matchLevels.map((l) => z.literal(l)))),
});

export type MatchIdentifier = z.infer<typeof matchIdentifier>;

export const matchSchema = z.object({
  ...matchIdentifier.shape,
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

/**
  Ascending comparison. Returns:
  - 0, if matches share identifiers
  - greater than 0, if match a is BEFORE match b
  - less than 0, if match a is AFTER match b
 */
export function compareMatches(a: MatchIdentifier, b: MatchIdentifier) {
  return (
    matchLevels.indexOf(a.level || "qm") - matchLevels.indexOf(b.level || "qm") ||
    (a.set || 1) - (b.set || 1) ||
    a.number - b.number
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

export const teamSchema = z.object({ number: z.string(), name: z.string() });
export type Team = z.infer<typeof teamSchema>;

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
