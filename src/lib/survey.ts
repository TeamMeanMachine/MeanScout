import { z } from "zod";
import { pickListSchema } from "./rank";
import { expressionSchema, sortExpressions } from "./expression";
import type { SingleFieldWithDetails } from "./field";

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
  const expressions = Object.groupBy(sortedExpressions, (e) => {
    if (e.scope == "entry" && e.input.from == "expressions") return "entryDerived";
    if (e.scope == "entry" && e.input.from == "tba") return "entryTba";
    if (e.scope == "entry" && e.input.from == "fields") return "entryPrimitive";
    if (e.scope == "survey" && e.input.from == "expressions") return "surveyDerived";
    if (e.scope == "survey" && e.input.from == "tba") return "surveyTba";
    if (e.scope == "survey" && e.input.from == "fields") return "surveyPrimitive";
    return "";
  });

  return [
    {
      survey,
      category: "Pick Lists",
      pickLists: survey.pickLists,
    },
    {
      survey,
      category: "Aggregate Expressions from expressions",
      expressions: expressions.surveyDerived,
    },
    {
      survey,
      category: "Aggregate Expressions from TBA",
      expressions: expressions.surveyTba,
    },
    {
      survey,
      category: "Aggregate Expressions from fields",
      expressions: expressions.surveyPrimitive,
    },
    {
      survey,
      category: "Entry Expressions from expressions",
      expressions: expressions.entryDerived,
    },
    {
      survey,
      category: "Entry Expressions from TBA",
      expressions: expressions.entryTba,
    },
    {
      survey,
      category: "Entry Expressions from fields",
      expressions: expressions.entryPrimitive,
    },
    {
      survey,
      category: "Fields",
      fields: orderedSingleFields.filter((f) => ["number", "toggle", "rating", "timer"].includes(f.field.type)),
    },
  ].filter((group) => group.pickLists?.length || group.expressions?.length || group.fields?.length);
}
