import { z } from "zod";
import { pickListSchema } from "./analysis";
import { expressionSchema } from "./expression";
import type { Entry } from "./entry";
import type { Comp } from "./comp";

export const surveyTypes = ["match", "pit"] as const;
export type SurveyType = (typeof surveyTypes)[number];

const baseSurveySchema = z.object({
  id: z.string(),
  compId: z.string(),
  name: z.string(),
  fieldIds: z.array(z.string()),
  created: z.date(),
  modified: z.date(),
});

const matchSurveySchema = z.object({
  ...baseSurveySchema.shape,
  type: z.literal("match"),
  tbaMetrics: z.optional(z.array(z.string())),
  pickLists: z.array(pickListSchema),
  expressions: z.array(expressionSchema),
});
export type MatchSurvey = z.infer<typeof matchSurveySchema>;

const pitSurveySchema = z.object({
  ...baseSurveySchema.shape,
  type: z.literal("pit"),
});
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
