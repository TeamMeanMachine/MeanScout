import { download, matchValueSchema, share, valueSchema, type Value } from "$lib";
import { z } from "zod";
import type { Survey } from "./survey";
import { getDefaultFieldValue, type DetailedSingleField, type SingleField } from "./field";
import { compress, decompress } from "./compress";
import type { Target } from "./settings";

export const entryStatuses = ["draft", "submitted", "exported"] as const;
export type EntryStatus = (typeof entryStatuses)[number];

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

export function exportEntries(entryRecords: IDBRecord<Entry>[]) {
  const entries = entryRecords.map((entry) => {
    return {
      ...entry,
      id: undefined,
      type: undefined,
      surveyId: undefined,
      status: undefined,
      created: undefined,
      modified: undefined,
    };
  });

  return JSON.stringify(entries);
}

export function exportEntriesCompressed(entryRecords: IDBRecord<Entry>[]) {
  return compress(exportEntries(entryRecords));
}

export function importEntries(
  surveyRecord: IDBRecord<Survey>,
  data: string,
): { success: true; entries: Entry[] } | { success: false; error: string } {
  let decompressed: Partial<Entry>[] = JSON.parse(data);

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
  if (value === 0 || value === false) {
    return "";
  } else if (value === true) {
    return "1";
  } else if (typeof value == "string") {
    return value.replaceAll(",", ";").replaceAll("\n", "; ").trim();
  } else {
    return value;
  }
}

export function entryToCSV(entry: Entry) {
  const values = [valueToCSV(entry.team)];
  if (entry.type == "match") {
    values.push(valueToCSV(entry.match), valueToCSV(entry.absent));
  }
  if (entry.type != "match" || !entry.absent) {
    values.push(...entry.values.map(valueToCSV));
  }
  return values.join(",");
}

function csvToValue(csv: string, field: SingleField) {
  if (field.type == "number") {
    return Number(csv);
  } else if (field.type == "toggle") {
    return !!csv;
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
      const absent = !!entryCSV[2];

      let values: Value[] = [];

      if (absent) {
        values = singleFields.map((field) => getDefaultFieldValue(field.field));
      } else {
        const compressedValues = entryCSV.slice(3);
        for (let i = 0; i < compressedValues.length; i++) {
          values.push(csvToValue(compressedValues[i].trim(), singleFields[i].field));
        }
      }

      return {
        surveyId: surveyRecord.id,
        type: "match",
        status: "exported",
        team: entryCSV[0],
        match: parseInt(entryCSV[1]),
        absent,
        values,
        created: new Date(),
        modified: new Date(),
      };
    });
  } else {
    return entries.map((entryCSV): PitEntry => {
      const compressedValues = entryCSV.slice(1);

      let values: Value[] = [];
      for (let i = 0; i < compressedValues.length; i++) {
        values.push(csvToValue(compressedValues[i].trim(), singleFields[i].field));
      }

      return {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "exported",
        team: entryCSV[0],
        values,
        created: new Date(),
        modified: new Date(),
      };
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

export function shareEntryAsFile(entryOrEntries: Entry | Entry[], survey: Survey) {
  let csv = "";
  if (Array.isArray(entryOrEntries)) {
    csv = entryOrEntries.map(entryToCSV).join("\n");
  } else {
    csv = entryToCSV(entryOrEntries);
  }
  share(csv, createEntryFileName(survey, entryOrEntries), "text/csv");
}

export function saveEntryAsFile(entryOrEntries: Entry | Entry[], survey: Survey) {
  let csv = "";
  if (Array.isArray(entryOrEntries)) {
    csv = entryOrEntries.map(entryToCSV).join("\n");
  } else {
    csv = entryToCSV(entryOrEntries);
  }
  download(csv, createEntryFileName(survey, entryOrEntries), "text/csv");
}
