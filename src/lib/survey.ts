import { z } from "zod";
import { expressionSchema, sortExpressions } from "./expression";
import { isNumericField, type SingleFieldWithDetails } from "./field";
import { pickListSchema } from "./rank";

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

export function groupRanks(survey: MatchSurvey, orderedSingleFields: SingleFieldWithDetails[]) {
  const sortedExpressions = survey.expressions.toSorted(sortExpressions);
  const expressions = {
    survey: sortedExpressions.filter((e) => e.scope == "survey"),
    entry: sortedExpressions.filter((e) => e.scope == "entry"),
  };

  return {
    survey,
    groups: [
      { category: "Pick Lists" as const, pickLists: survey.pickLists },
      { category: "Aggregate Expressions" as const, expressions: expressions.survey },
      { category: "Entry Expressions" as const, expressions: expressions.entry },
      { category: "Fields" as const, fields: orderedSingleFields.filter(isNumericField) },
    ],
  };
}
