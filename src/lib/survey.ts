import { z } from "zod";
import { pickListSchema } from "./analysis";
import { expressionSchema, sortExpressions } from "./expression";

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

export function groupRanks(survey: MatchSurvey) {
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
      category: "Survey Expressions from expressions",
      expressions: expressions.surveyDerived,
    },
    {
      survey,
      category: "Survey Expressions from TBA",
      expressions: expressions.surveyTba,
    },
    {
      survey,
      category: "Survey Expressions from fields",
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
  ].filter((group) => group.pickLists?.length || group.expressions?.length);
}
