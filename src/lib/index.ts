import { z } from "zod";
import type { Entry } from "./entry";
import type { MatchTarget, Target } from "./settings";
import type { Survey } from "./survey";

export const schemaVersion = 9;

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
});
export type Match = z.infer<typeof matchSchema>;

export type TeamInfo = {
  team: string;
  entryCount: number;
  matchCount: number;
  isCustom: boolean;
  pickListRanks?: number[] | undefined;
  skipped?: boolean | undefined;
};

export type EntryFilters = {
  team: string | undefined;
  match: number | undefined;
  absent: boolean | undefined;
  target: MatchTarget | undefined;
  exported: boolean | undefined;
};

export function createEntryFileName(survey: Survey, entryOrEntries: Entry | Entry[], target?: Target) {
  if (Array.isArray(entryOrEntries)) {
    if (target) {
      var fileName = `${survey.name}-entries-${target}.csv`;
    } else {
      var fileName = `${survey.name}-entries.csv`;
    }
  } else if (entryOrEntries.type == "match") {
    var fileName = `${survey.name}-entry-${entryOrEntries.team}-${entryOrEntries.match}-${entryOrEntries.absent}.csv`;
  } else {
    var fileName = `${survey.name}-entry-${entryOrEntries.team}.csv`;
  }

  return fileName.replaceAll(" ", "_");
}

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
