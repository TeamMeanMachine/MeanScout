import { z } from "zod";
import type { Entry } from "./entry";
import type { DetailedSingleField } from "./field";
import { reduceExpressionTypes, type Expression, type ExpressionMethod } from "./expression";

export const pickListSchema = z.object({
  name: z.string(),
  weights: z.array(z.object({ expressionName: z.string(), percentage: z.number() })),
});

export type PickList = z.infer<typeof pickListSchema>;

export function calculateTeamData(
  expressionName: string,
  expressions: Expression[],
  entriesByTeam: Record<string, IDBRecord<Entry>[]>,
  fields: DetailedSingleField[],
) {
  const expression = expressions.find((e) => e.name == expressionName);
  const teamData: Record<string, number> = {};
  for (const team in entriesByTeam) {
    let value = runExpression(team, expressionName, expressions, entriesByTeam[team], fields);
    if (Array.isArray(value) && expression && reduceExpressionTypes.includes(expression.method.type as any)) {
      value = runExpressionMethod(expression.method, value);
    }
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
    normalizedTeamData[team] = Math.max(0, (teamData[team] / (bestValue || 1)) * percentage);
  }
  return normalizedTeamData;
}

function runExpression(
  team: string,
  expressionName: string,
  expressions: Expression[],
  entries: Entry[],
  fields: DetailedSingleField[],
): number | number[] {
  const expression = expressions.find((e) => e.name == expressionName);
  if (!expression) return 0;

  const { scope, input, method } = expression;

  if (scope == "entry") {
    if (input.from == "fields") {
      return entries.flatMap((entry) => {
        const entryValues = input.fieldIds.map((fieldId) => {
          const fieldIndex = fields.findIndex((field) => field.field.id == fieldId);
          if (fieldIndex == -1) return 0;
          return entry.values[fieldIndex];
        });

        return runExpressionMethod(method, entryValues);
      });
    } else if (input.from == "expressions") {
      return input.expressionNames.flatMap((expressionName) => {
        return runExpression(team, expressionName, expressions, entries, fields);
      });
    } else {
      throw new Error("Invalid expression input");
    }
  } else if (scope == "survey") {
    let values: any[] = [];

    if (input.from == "fields") {
      values = input.fieldIds.flatMap((fieldId) => {
        const fieldIndex = fields.findIndex((field) => field.field.id == fieldId);
        if (fieldIndex == -1) return 0;
        return entries.map((entry) => entry.values[fieldIndex]);
      });
    } else if (input.from == "expressions") {
      values = input.expressionNames.flatMap((expressionName) => {
        return runExpression(team, expressionName, expressions, entries, fields);
      });
    } else {
      throw new Error("Invalid expression input");
    }

    return runExpressionMethod(method, values);
  } else {
    throw new Error("Invalid expression scope");
  }
}

function runExpressionMethod(method: ExpressionMethod, values: any[]) {
  switch (method.type) {
    case "average":
      return values.reduce((prev, curr) => prev + curr, 0) / (values.length || 1);
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "sum":
      return values.reduce((prev, curr) => prev + curr, 0) as number;
    case "count":
      return values.reduce((prev, curr) => {
        if (curr != method.valueToCount) return prev;
        return prev + 1;
      }, 0) as number;
    case "convert":
      return values.map((value) => {
        for (const converter of method.converters) {
          if (value == converter.from) {
            return converter.to;
          }
        }
        return method.defaultTo === "" ? value : method.defaultTo;
      });
    case "multiply":
      return values.map((value) => value * method.multiplier);
    case "divide":
      return values.map((value) => value / (method.divisor || 1));
    case "abs":
      return values.map((value) => Math.abs(value));
    default:
      const unhandledExpression: never = method;
      throw new Error(`Unhandled type for expression method: ${(unhandledExpression as ExpressionMethod).type}`);
  }
}

const colors = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc"];

export function getTeamColor(team: string) {
  return colors[parseInt(team) % colors.length];
}
