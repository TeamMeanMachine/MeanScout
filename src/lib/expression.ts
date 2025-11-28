import { z } from "zod";
import { valueSchema } from "./";

export const reduceExpressionTypes = ["average", "min", "max", "sum", "count"] as const;
export const mapExpressionTypes = ["convert", "multiply", "divide", "abs"] as const;
const expressionTypes = [...reduceExpressionTypes, ...mapExpressionTypes] as const;

const fieldInputSchema = z.object({ from: z.literal("fields"), fieldIds: z.array(z.string()) });
const tbaMetricInputSchema = z.object({ from: z.literal("tba"), metrics: z.array(z.string()) });
const expressionInputSchema = z.object({ from: z.literal("expressions"), expressionNames: z.array(z.string()) });
const inputSchema = z.discriminatedUnion("from", [fieldInputSchema, tbaMetricInputSchema, expressionInputSchema]);

const inputsSchema = z.discriminatedUnion("from", [
  z.object({ from: z.literal("field"), fieldId: z.string() }),
  z.object({ from: z.literal("tba"), tbaMetric: z.string() }),
  z.object({ from: z.literal("expression"), expressionName: z.string() }),
]);

const reduceMethodsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("average") }),
  z.object({ type: z.literal("min") }),
  z.object({ type: z.literal("max") }),
  z.object({ type: z.literal("sum") }),
  z.object({ type: z.literal("count"), valueToCount: valueSchema }),
]);
const convertMethodSchema = z.object({
  type: z.literal("convert"),
  converters: z.array(z.object({ from: valueSchema, to: z.number() })),
  defaultTo: z.optional(z.number()),
});
const mapMethodsSchema = z.discriminatedUnion("type", [
  convertMethodSchema,
  z.object({ type: z.literal("multiply"), multiplier: z.number() }),
  z.object({ type: z.literal("divide"), divisor: z.number().gt(0).or(z.number().lt(0)) }),
  z.object({ type: z.literal("abs") }),
]);
const methodSchema = z.discriminatedUnion("type", [...reduceMethodsSchema.options, ...mapMethodsSchema.options]);

const entryExpressionSchema = z.object({
  name: z.string(),
  scope: z.literal("entry"),
  input: inputSchema,
  inputs: z.array(inputsSchema).optional(),
  method: methodSchema,
});
const surveyExpressionSchema = z.object({
  name: z.string(),
  scope: z.literal("survey"),
  input: inputSchema,
  inputs: z.array(inputsSchema).optional(),
  method: methodSchema,
});
export const expressionSchema = z.discriminatedUnion("scope", [entryExpressionSchema, surveyExpressionSchema]);

export type ExpressionInput = z.infer<typeof inputSchema>;

export type ExpressionMethod = z.infer<typeof methodSchema>;
export type ConvertExpressionMethod = Extract<ExpressionMethod, { type: "convert" }>;

export type Expression = z.infer<typeof expressionSchema>;
export type SurveyExpression = Extract<Expression, { scope: "survey" }>;
export type EntryExpression = Extract<Expression, { scope: "entry" }>;

export function sortExpressions(a: Expression, b: Expression) {
  if (a.scope == "survey" && b.scope == "entry") {
    return -1;
  }

  if (a.scope == "entry" && b.scope == "survey") {
    return 1;
  }

  let aHighestInputType: "expression" | "tba" | "field" = "field";
  let bHighestInputType: "expression" | "tba" | "field" = "field";

  if (a.input.from == "expressions" || a.inputs?.some((i) => i.from == "expression")) {
    aHighestInputType = "expression";
  } else if (a.input.from == "tba" || a.inputs?.some((i) => i.from == "tba")) {
    aHighestInputType = "tba";
  }

  if (b.input.from == "expressions" || b.inputs?.some((i) => i.from == "expression")) {
    bHighestInputType = "expression";
  } else if (b.input.from == "tba" || b.inputs?.some((i) => i.from == "tba")) {
    bHighestInputType = "tba";
  }

  if (aHighestInputType == "expression" && bHighestInputType != "expression") {
    return -1;
  }

  if (aHighestInputType != "expression" && bHighestInputType == "expression") {
    return 1;
  }

  if (aHighestInputType == "expression" && bHighestInputType == "expression") {
    if (
      (a.input.from == "expressions" && a.input.expressionNames.includes(b.name)) ||
      a.inputs?.some((i) => i.from == "expression" && i.expressionName == b.name)
    ) {
      return -1;
    }

    if (
      (b.input.from == "expressions" && b.input.expressionNames.includes(a.name)) ||
      b.inputs?.some((i) => i.from == "expression" && i.expressionName == a.name)
    ) {
      return 1;
    }
  }

  if (aHighestInputType == "tba" && bHighestInputType == "field") {
    return -1;
  }

  if (aHighestInputType == "field" && bHighestInputType == "tba") {
    return 1;
  }

  return (
    expressionTypes.findIndex((type) => type == a.method.type) -
      expressionTypes.findIndex((type) => type == b.method.type) || a.name.localeCompare(b.name)
  );
}
