import { matchValueSchema, valueSchema, type Value } from "$lib";
import { z } from "zod";
import type { Survey } from "./survey";
import { flattenFields, getDefaultFieldValue, type SingleField } from "./field";

export const entryStatuses = ["draft", "submitted", "exported"] as const;
export type EntryStatus = (typeof entryStatuses)[number];

const baseEntrySchema = z.object({
  surveyId: z.number(),
  status: z.enum(entryStatuses),
  team: z.string(),
  values: z.array(valueSchema),
  created: z.coerce.date(),
  modified: z.coerce.date(),
});

const matchEntrySchema = baseEntrySchema.merge(
  z.object({
    type: z.literal("match"),
    match: matchValueSchema,
    absent: z.boolean(),
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

export function csvToEntries(csv: string, surveyRecord: IDBRecord<Survey>): Entry[] {
  const entries = csv.split("\n").map((line) => {
    return line.split(",").map((value) => value.trim());
  });
  const fields = flattenFields(surveyRecord.fields);

  if (surveyRecord.type == "match") {
    return entries.map((entryCSV): MatchEntry => {
      const absent = !!entryCSV[2];

      let values: Value[] = [];

      if (absent) {
        values = fields.map(getDefaultFieldValue);
      } else {
        const compressedValues = entryCSV.slice(3);
        for (let i = 0; i < compressedValues.length; i++) {
          values.push(csvToValue(compressedValues[i].trim(), fields[i]));
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
        values.push(csvToValue(compressedValues[i].trim(), fields[i]));
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
