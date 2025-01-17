import { valueSchema } from "$lib";
import { z } from "zod";
import type { Entry } from "./entry";
import type { DetailedSingleField } from "./field";

export const reduceExpressionTypes = ["average", "min", "max", "sum", "count"] as const;
export const mapExpressionTypes = ["convert", "multiply", "divide", "abs"] as const;

const expressionFromFieldsSchema = z.object({
  name: z.string(),
  scope: z.literal("entry").or(z.literal("survey")),
  from: z.literal("fields"),
  fieldIds: z.array(z.number()),
});

const expressionFromExpressionsSchema = z.object({
  name: z.string(),
  scope: z.literal("entry").or(z.literal("survey")),
  from: z.literal("expressions"),
  expressionNames: z.array(z.string()),
});

const baseExpressionWithInputsSchema = z.discriminatedUnion("from", [
  expressionFromFieldsSchema,
  expressionFromExpressionsSchema,
]);

const reduceExpressionOptionsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("average") }),
  z.object({ type: z.literal("min") }),
  z.object({ type: z.literal("max") }),
  z.object({ type: z.literal("sum") }),
  z.object({ type: z.literal("count"), valueToCount: valueSchema }),
]);

const convertExpressionOptionsSchema = z.object({
  type: z.literal("convert"),
  converters: z.array(z.object({ from: valueSchema, to: valueSchema })),
  defaultTo: valueSchema,
});

const mapExpressionOptionsSchema = z.discriminatedUnion("type", [
  convertExpressionOptionsSchema,
  z.object({ type: z.literal("multiply"), multiplier: z.number().finite() }),
  z.object({ type: z.literal("divide"), divisor: z.number().gt(0).or(z.number().lt(0)) }),
  z.object({ type: z.literal("abs") }),
]);

const expressionOptionsSchema = z.discriminatedUnion("type", [
  ...reduceExpressionOptionsSchema.options,
  ...mapExpressionOptionsSchema.options,
]);

export const expressionSchema = z.intersection(baseExpressionWithInputsSchema, expressionOptionsSchema);

export const pickListSchema = z.object({
  name: z.string(),
  weights: z.array(z.object({ expressionName: z.string(), percentage: z.number() })),
});

type BaseExpressionWithInputs = z.infer<typeof baseExpressionWithInputsSchema>;
export type ConvertExpression = BaseExpressionWithInputs & z.infer<typeof convertExpressionOptionsSchema>;

type ExpressionOptions = z.infer<typeof expressionOptionsSchema>;
export type ExpressionFromFields = z.infer<typeof expressionFromFieldsSchema> & ExpressionOptions;
export type ExpressionFromExpressions = z.infer<typeof expressionFromExpressionsSchema> & ExpressionOptions;

export type Expression = z.infer<typeof expressionSchema>;
export type PickList = z.infer<typeof pickListSchema>;

export function calculateTeamData(
  expressionName: string,
  expressions: Expression[],
  entriesByTeam: Record<string, IDBRecord<Entry>[]>,
  fields: DetailedSingleField[],
) {
  const teamData: Record<string, number> = {};
  for (const team in entriesByTeam) {
    let value = runExpression(team, expressionName, expressions, entriesByTeam[team], fields);
    if (Array.isArray(value)) {
      value = value.reduce((prev, curr) => prev + curr, 0) / value.length;
    }
    teamData[team] = value;
  }
  return teamData;
}

export function normalizeTeamData(teamData: Record<string, number>, percentage = 100) {
  const bestValue = Math.max(...Object.values(teamData));
  const normalizedTeamData: Record<string, number> = {};
  for (const team in teamData) {
    if (bestValue == 0) {
      normalizedTeamData[team] = 0;
    } else {
      normalizedTeamData[team] = (teamData[team] / bestValue) * percentage;
    }
  }
  return normalizedTeamData;
}

function runExpression(
  team: string,
  expressionName: string,
  expressions: Expression[],
  entries: Entry[],
  fields: DetailedSingleField[],
) {
  const expression = expressions.find((e) => e.name == expressionName);
  if (!expression) return 0;

  let values: any[] = [];
  if (expression.from == "fields") {
    values = expression.fieldIds.flatMap((fieldId) => {
      const fieldIndex = fields.findIndex((field) => field.field.id == fieldId);
      if (fieldIndex == -1) return 0;
      return entries.map((entry) => entry.values[fieldIndex]);
    });
  } else if (expression.from == "expressions") {
    values = expression.expressionNames.flatMap((expressionName) => {
      return runExpression(team, expressionName, expressions, entries, fields);
    });
  }

  switch (expression.type) {
    case "average":
      return values.reduce((prev, curr) => prev + curr, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "sum":
      return values.reduce((prev, curr) => prev + curr, 0) as number;
    case "count":
      return values.reduce((prev, curr) => {
        if (expression?.type != "count") return prev;
        if (curr != expression.valueToCount) return prev;
        return prev + 1;
      }, 0) as number;
    case "convert":
      return values.map((value) => {
        if (expression?.type != "convert") return value;
        for (const converter of expression.converters) {
          if (value == converter.from) {
            return converter.to;
          }
        }
        return expression.defaultTo === "" ? value : expression.defaultTo;
      });
    case "multiply":
      return values.map((value) => {
        if (expression?.type != "multiply") return value;
        return value * expression.multiplier;
      });
    case "divide":
      return values.map((value) => {
        if (expression?.type != "divide") return value;
        return value / expression.divisor;
      });
    case "abs":
      return values.map((value) => {
        if (expression?.type != "abs") return value;
        return Math.abs(value);
      });
    default:
      const unhandledExpression: never = expression;
      throw new Error(`Unhandled type for expression: ${(unhandledExpression as Expression).type}`);
  }
}
