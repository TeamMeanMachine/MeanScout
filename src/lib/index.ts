import { browser } from "$app/environment";
import { invalidateAll } from "$app/navigation";
import { writable } from "svelte/store";
import { z } from "zod";

const bc = new BroadcastChannel("invalidate");
bc.onmessage = () => invalidateAll();

/** Reload data on other browsing contexts (assuming `invalidateAll` was already called on this one). */
export function rerunOtherContextLoads() {
  bc.postMessage(undefined);
}

/** Reloads data on all browsing contexts (including this one). */
export function rerunAllContextLoads() {
  bc.postMessage(undefined);
  invalidateAll();
}

export const schemaVersion = 16;

export const valueSchema = z.string().or(z.number()).or(z.boolean());
export type Value = z.infer<typeof valueSchema>;

const teamInsightsSchema = z.object({
  opr: z.optional(z.number()),
  dpr: z.optional(z.number()),
  ccwm: z.optional(z.number()),
  coprs: z.optional(z.record(z.string(), z.number())),
});
export type TeamInsights = z.infer<typeof teamInsightsSchema>;

export const teamSchema = z.object({
  number: z.string(),
  name: z.string(),
});
export type Team = z.infer<typeof teamSchema>;

export function isValidTeam(team: string) {
  return /^\d{1,5}[A-Z]?$/.test(team);
}

export function getTeamName(team: string, teams: Team[]) {
  return (
    teams.find((t) => t.number == team && t.name)?.name ||
    teams.find((t) => parseInt(t.number) == parseInt(team) && t.name)?.name
  );
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

const oprLabelDict: Record<string, string> = {
  oprs: "OPRs",
  dprs: "DPRs",
  ccwms: "CCWMs",
  opr: "OPR",
  dpr: "DPR",
  ccwm: "CCWM",
  rp: "Ranking Points",
};

export function convertOprToLabel(opr: string) {
  const label = oprLabelDict[opr];
  if (label) {
    return label;
  }

  if (opr.includes(" ")) {
    return opr;
  }

  const result = opr.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}
