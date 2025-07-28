import { z } from "zod";
import { teamStore, type MatchTarget } from "./settings";
import { get, writable } from "svelte/store";
import { browser } from "$app/environment";

export const schemaVersion = 16;

export type Heading = { type: "h1" | "sm"; text: string }[] | string;

export const valueSchema = z.string().or(z.number()).or(z.boolean());
export type Value = z.infer<typeof valueSchema>;

export const matchValueSchema = z.number().int().gt(0);

export const matchSchema = z.object({
  number: matchValueSchema,
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

export function getMatchTeamFontWeight(team: string) {
  const teamStoreValue = get(teamStore);
  if (!teamStoreValue) return "";
  if (team == teamStoreValue) return "font-bold underline";
  return "font-light";
}

export const teamSchema = z.object({ number: z.string(), name: z.string() });
export type Team = z.infer<typeof teamSchema>;

export type EntryFilters = {
  team: string | undefined;
  match: number | undefined;
  absent: boolean | undefined;
  target: MatchTarget | undefined;
  exported: boolean | undefined;
  scout: string | undefined;
};

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
