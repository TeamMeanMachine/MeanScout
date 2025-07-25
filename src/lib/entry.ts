import { matchValueSchema, valueSchema, type Value } from "./";
import { z } from "zod";
import type { MatchSurvey, PitSurvey } from "./survey";
import { getFieldsWithDetails } from "./field";
import type { Comp } from "./comp";

export type EntryPageData = {
  compRecord: IDBRecord<Comp>;
  fieldsWithDetails: ReturnType<typeof getFieldsWithDetails>;
  defaultValues: Value[];
  teamName: string | undefined;
} & (
  | { surveyType: "match"; entryRecord: IDBRecord<MatchEntry>; surveyRecord: IDBRecord<MatchSurvey> }
  | { surveyType: "pit"; entryRecord: IDBRecord<PitEntry>; surveyRecord: IDBRecord<PitSurvey> }
);

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
