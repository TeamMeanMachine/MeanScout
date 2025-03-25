import { matchValueSchema, valueSchema, type Value } from "$lib";
import { z } from "zod";
import type { Survey } from "./survey";
import { getDefaultFieldValue, type DetailedSingleField, type SingleField } from "./field";
import { compress, decompress } from "./compress";

export const entryStatuses = ["draft", "submitted", "exported"] as const;
export type EntryStatus = (typeof entryStatuses)[number];

const tbaMetricsSchema = z.array(z.object({ name: z.string(), value: valueSchema }));
export type TbaMetrics = z.infer<typeof tbaMetricsSchema>;

const baseEntrySchema = z.object({
  surveyId: z.number(),
  status: z.enum(entryStatuses),
  team: z.string(),
  values: z.array(valueSchema),
  scout: z.optional(z.string()),
  created: z.coerce.date(),
  modified: z.coerce.date(),
});

const matchEntrySchema = baseEntrySchema.merge(
  z.object({
    type: z.literal("match"),
    match: matchValueSchema,
    absent: z.boolean(),
    tbaMetrics: z.optional(tbaMetricsSchema),
    prediction: z.optional(z.literal("red").or(z.literal("blue"))),
    predictionReason: z.optional(z.string()),
  }),
);

export type MatchEntry = z.infer<typeof matchEntrySchema>;

const pitEntrySchema = baseEntrySchema.merge(
  z.object({
    type: z.literal("pit"),
  }),
);
export type PitEntry = z.infer<typeof pitEntrySchema>;

const entrySchema = z.discriminatedUnion("type", [matchEntrySchema, pitEntrySchema]);
export type Entry = z.infer<typeof entrySchema>;

export function exportEntries(entries: Entry[]) {
  return JSON.stringify(
    entries.map((entry) => {
      return {
        ...entry,
        id: undefined,
        type: undefined,
        surveyId: undefined,
        status: undefined,
        created: undefined,
        modified: undefined,
      };
    }),
  );
}

export function exportEntriesCompressed(entries: Entry[]) {
  return compress(exportEntries(entries));
}

export function importEntries(
  surveyRecord: IDBRecord<Survey>,
  data: string,
): { success: true; entries: Entry[] } | { success: false; error: string } {
  let decompressed: Partial<Entry>[];

  try {
    decompressed = JSON.parse(data);
  } catch (e) {
    console.error("JSON failed to parse imported entries:", data);
    return { success: false, error: e instanceof Error ? e.message : "JSON failed to parse" };
  }

  let entries: Entry[];

  if (surveyRecord.type == "match") {
    entries = (decompressed as Partial<MatchEntry>[]).map((entry) => {
      return {
        surveyId: surveyRecord.id,
        type: "match",
        status: "exported",
        team: entry.team || "",
        match: entry.match || 0,
        absent: entry.absent || false,
        tbaMetrics: entry.tbaMetrics || undefined,
        values: entry.values || [],
        scout: entry.scout || undefined,
        prediction: entry.prediction || undefined,
        predictionReason: entry.predictionReason || undefined,
        created: new Date(),
        modified: new Date(),
      };
    });
  } else if (surveyRecord.type == "pit") {
    entries = decompressed.map((entry) => {
      return {
        surveyId: surveyRecord.id,
        type: "pit",
        status: "exported",
        team: entry.team || "",
        values: entry.values || [],
        scout: entry.scout || undefined,
        created: new Date(),
        modified: new Date(),
      };
    });
  } else {
    return { success: false, error: "Invalid type of entries" };
  }

  return { success: true, entries };
}

export async function importEntriesCompressed(surveyRecord: IDBRecord<Survey>, data: Uint8Array) {
  return importEntries(surveyRecord, await decompress(data));
}

function valueToCSV(value: Value) {
  if (value === false) {
    return "false";
  } else if (value === true) {
    return "true";
  } else if (typeof value == "string") {
    return value.replaceAll(",", ";").replaceAll("\n", "; ").trim();
  } else {
    return value;
  }
}

export function entryToCSV(entry: Entry) {
  const values: Value[] = [entry.team];

  if (entry.type == "match") {
    values.push(entry.match, entry.absent);
    if (!entry.absent) {
      values.push(...entry.values);
    }
    if (entry.scout) {
      values.push(entry.scout, entry.prediction || "", entry.predictionReason || "");
    }
  } else {
    values.push(...entry.values);
    if (entry.scout) {
      values.push(entry.scout);
    }
  }

  return values.map(valueToCSV).join(",");
}

function csvToValue(csv: string, field: SingleField) {
  if (field.type == "number") {
    return Number(csv);
  } else if (field.type == "toggle") {
    return csv == "true";
  } else if (field.type == "rating") {
    return Number(csv);
  } else if (field.type == "timer") {
    return Number(csv);
  } else {
    return csv;
  }
}

export function csvToEntries(
  csv: string,
  surveyRecord: IDBRecord<Survey>,
  singleFields: DetailedSingleField[],
): Entry[] {
  const entries = csv.split("\n").map((line) => {
    return line.split(",").map((value) => value.trim());
  });

  if (surveyRecord.type == "match") {
    return entries.map((entryCSV): MatchEntry => {
      const [team, match, absent, ...rest] = entryCSV;

      const entry: MatchEntry = {
        surveyId: surveyRecord.id,
        type: "match",
        status: "exported",
        team,
        match: Number(match),
        absent: absent == "true",
        values: [],
        created: new Date(),
        modified: new Date(),
      };

      if (entry.absent) {
        entry.values = singleFields.map((field) => getDefaultFieldValue(field.field));
      } else {
        entry.values = singleFields.map((field, i) => csvToValue(rest[i], field.field));
      }

      const [scout, prediction, predictionReason] = entry.absent ? rest : rest.slice(singleFields.length);

      if (scout) {
        entry.scout = scout;
        if (prediction == "red" || prediction == "blue") {
          entry.prediction = prediction;
          if (predictionReason) {
            entry.predictionReason = predictionReason;
          }
        }
      }

      return entry;
    });
  } else {
    return entries.map((entryCSV): PitEntry => {
      const [team, ...rest] = entryCSV;

      const entry: PitEntry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "exported",
        team,
        values: singleFields.map((field, i) => csvToValue(rest[i], field.field)),
        created: new Date(),
        modified: new Date(),
      };

      if (rest[singleFields.length]) {
        entry.scout = rest[singleFields.length];
      }

      return entry;
    });
  }
}

export function getMatchEntriesByTeam(entries: IDBRecord<MatchEntry>[]) {
  const entriesByTeam: Record<string, IDBRecord<MatchEntry>[]> = {};
  for (const entry of entries) {
    if (entry.team in entriesByTeam) {
      entriesByTeam[entry.team].push(entry);
    } else {
      entriesByTeam[entry.team] = [entry];
    }
  }
  return entriesByTeam;
}
