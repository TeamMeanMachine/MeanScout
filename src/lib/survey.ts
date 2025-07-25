import { z } from "zod";
import { pickListSchema } from "./analysis";
import type { Field, getFieldsWithDetails } from "./field";
import { expressionSchema } from "./expression";
import type { Entry, MatchEntry, PitEntry } from "./entry";
import type { Comp } from "./comp";

export type SurveyPageData = {
  compRecord: IDBRecord<Comp>;
  fieldRecords: IDBRecord<Field>[];
  fieldsWithDetails: ReturnType<typeof getFieldsWithDetails>;
} & (
  | { surveyType: "match"; surveyRecord: IDBRecord<MatchSurvey>; entryRecords: IDBRecord<MatchEntry>[] }
  | { surveyType: "pit"; surveyRecord: IDBRecord<PitSurvey>; entryRecords: IDBRecord<PitEntry>[] }
);

export const surveyTypes = ["match", "pit"] as const;
export type SurveyType = (typeof surveyTypes)[number];

const baseSurveySchema = z.object({
  name: z.string(),
  compId: z.number(),
  fieldIds: z.array(z.number()),
  created: z.coerce.date(),
  modified: z.coerce.date(),
});

const matchSurveySchema = baseSurveySchema.merge(
  z.object({
    type: z.literal("match"),
    tbaMetrics: z.optional(z.array(z.string())),
    pickLists: z.array(pickListSchema),
    expressions: z.array(expressionSchema),
  }),
);
export type MatchSurvey = z.infer<typeof matchSurveySchema>;

const pitSurveySchema = baseSurveySchema.merge(
  z.object({
    type: z.literal("pit"),
  }),
);
export type PitSurvey = z.infer<typeof pitSurveySchema>;

export const surveySchema = z.discriminatedUnion("type", [matchSurveySchema, pitSurveySchema]);
export type Survey = z.infer<typeof surveySchema>;

export function getLastCompletedMatch(comp: Comp, survey: Survey, entries: Entry[]) {
  let lastCompletedMatch = 0;

  if (survey.type == "match") {
    for (const match of comp.matches) {
      if (entries.some((e) => e.type == "match" && e.status != "draft" && e.match == match.number)) {
        lastCompletedMatch = Math.max(lastCompletedMatch, match.number);
      }
    }
  } else if (survey.type == "pit") {
    for (const match of comp.matches) {
      if (match.redScore && match.blueScore) {
        lastCompletedMatch = Math.max(lastCompletedMatch, match.number);
      }
    }
  }

  return lastCompletedMatch;
}
