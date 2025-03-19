import { z } from "zod";
import type { Entry } from "./entry";
import type { DetailedSingleField } from "./field";
import type { Expression, ExpressionMethod } from "./expression";

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
  if (!expression) throw new Error(`Could not find expression named ${expressionName}`);

  const { scope } = expression;

  const teamData: Record<string, number> = {};

  if (scope == "entry") {
    for (const team in entriesByTeam) {
      if (!entriesByTeam[team].length) {
        teamData[team] = 0;
        continue;
      }

      const values = entriesByTeam[team].map((entry) => {
        return runEntryExpression(entry, expression, expressions, fields);
      });

      teamData[team] = values.reduce((prev, curr) => prev + curr, 0) / values.length;
    }
  }

  if (scope == "survey") {
    for (const team in entriesByTeam) {
      if (!entriesByTeam[team].length) {
        teamData[team] = 0;
        continue;
      }

      teamData[team] = runSurveyExpression(entriesByTeam[team], expression, expressions, fields);
    }
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

function runEntryExpression(
  entry: IDBRecord<Entry>,
  expression: Extract<Expression, { scope: "entry" }>,
  expressions: Expression[],
  fields: DetailedSingleField[],
): number {
  const { input } = expression;

  if (input.from == "fields") {
    const values = input.fieldIds.map((fieldId) => {
      const fieldIndex = fields.findIndex((field) => field.field.id == fieldId);
      if (fieldIndex == -1) throw new Error(`Could not find field with id ${fieldId}`);

      return entry.values[fieldIndex];
    });

    const valueOrValues = runExpressionMethod(expression.method, values);
    if (Array.isArray(valueOrValues)) {
      return valueOrValues.reduce((prev, curr) => prev + curr, 0) / valueOrValues.length;
    }
    return valueOrValues;
  }

  if (input.from == "expressions") {
    const values = input.expressionNames.map((expressionName) => {
      const expression = expressions.find((e) => e.name == expressionName);
      if (!expression) throw new Error(`Could not find expression named ${expressionName}`);
      if (expression.scope != "entry") throw new Error("Invalid expression scope");

      return runEntryExpression(entry, expression, expressions, fields);
    });

    const valueOrValues = runExpressionMethod(expression.method, values);
    if (Array.isArray(valueOrValues)) {
      return valueOrValues.reduce((prev, curr) => prev + curr, 0) / valueOrValues.length;
    }
    return valueOrValues;
  }

  throw new Error("Invalid expression input");
}

function runSurveyExpression(
  entries: IDBRecord<Entry>[],
  expression: Extract<Expression, { scope: "survey" }>,
  expressions: Expression[],
  fields: DetailedSingleField[],
): number {
  const { input } = expression;

  if (input.from == "fields") {
    const values = input.fieldIds
      .map((fieldId) => {
        const fieldIndex = fields.findIndex((field) => field.field.id == fieldId);
        if (fieldIndex == -1) throw new Error(`Could not find field with id ${fieldId}`);

        return entries.map((entry) => entry.values[fieldIndex]);
      })
      .map((valueOrValues: number | any[]) => {
        if (Array.isArray(valueOrValues)) {
          valueOrValues = runExpressionMethod(expression.method, valueOrValues);
        }
        if (Array.isArray(valueOrValues)) {
          return valueOrValues.reduce((prev, curr) => prev + curr, 0) / valueOrValues.length;
        }
        return valueOrValues;
      });

    return values.reduce((prev, curr) => prev + curr, 0) / values.length;
  }

  if (input.from == "expressions") {
    const values = input.expressionNames.map((expressionName) => {
      const expression = expressions.find((e) => e.name == expressionName);
      if (!expression) throw new Error(`Could not find expression named ${expressionName}`);

      if (expression.scope == "entry") {
        const values = entries.map((entry) => {
          return runEntryExpression(entry, expression, expressions, fields);
        });

        return values.reduce((prev, curr) => prev + curr, 0) / values.length;
      }

      if (expression.scope == "survey") {
        return runSurveyExpression(entries, expression, expressions, fields);
      }

      throw new Error("Invalid expression scope");
    });

    const valueOrValues = runExpressionMethod(expression.method, values);
    if (Array.isArray(valueOrValues)) {
      return valueOrValues.reduce((prev, curr) => prev + curr, 0) / valueOrValues.length;
    }
    return valueOrValues;
  }

  throw new Error("Invalid expression input");
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

export const colors = [
  "#5470c6",
  "#91cc75",
  "#fac858",
  "#ee6666",
  "#73c0de",
  "#3ba272",
  "#fc8452",
  "#9a60b4",
  "#ea7ccc",
] as const;

export function getTeamColor(team: string) {
  return colors[parseInt(team) % colors.length];
}
