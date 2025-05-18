import { z } from "zod";
import type { Entry } from "./entry";
import type { SingleFieldWithDetails } from "./field";
import { expressionSchema, type Expression, type ExpressionMethod } from "./expression";
import type { MatchSurvey } from "./survey";

const weightSchema = z.object({ expressionName: z.string(), percentage: z.number() });

export const pickListSchema = z.object({
  name: z.string(),
  weights: z.array(weightSchema),
});
export type PickList = z.infer<typeof pickListSchema>;

const pickListTeamData = z.object({
  team: z.string(),
  teamName: z.string(),
  percentage: z.number(),
  weights: z.record(z.number()),
});

const expressionTeamData = z.object({
  team: z.string(),
  teamName: z.string(),
  value: z.number(),
});

const pickListAnalysisData = z.object({
  type: z.literal("picklist"),
  pickList: pickListSchema,
  data: z.array(pickListTeamData),
  sortedWeights: z.array(weightSchema),
  text: z.string(),
});
export type PickListAnalysisData = z.infer<typeof pickListAnalysisData>;

const expressionAnalysisData = z.object({
  type: z.literal("expression"),
  expression: expressionSchema,
  data: z.array(expressionTeamData),
  maxValue: z.number(),
  minValue: z.number(),
  text: z.string(),
});
export type ExpressionAnalysisData = z.infer<typeof expressionAnalysisData>;

const analysisData = z.discriminatedUnion("type", [pickListAnalysisData, expressionAnalysisData]);
export type AnalysisData = z.infer<typeof analysisData>;

export function getPickListData(
  pickListName: string,
  surveyRecord: MatchSurvey,
  entriesByTeam: Record<string, IDBRecord<Entry>[]>,
  orderedSingleFields: SingleFieldWithDetails[],
): PickListAnalysisData | undefined {
  const pickList = surveyRecord.pickLists.find((pl) => pl.name == pickListName);
  if (!pickList) return;

  const pickListData: Record<string, number> = {};
  const weightsData: Record<string, number[]> = {};

  for (const team in entriesByTeam) {
    pickListData[team] = 0;
    weightsData[team] = [];
  }

  for (const { percentage, expressionName } of pickList.weights) {
    const teamData = calculateTeamData(expressionName, surveyRecord.expressions, entriesByTeam, orderedSingleFields);
    const normalizedTeamData = normalizeTeamData(teamData, percentage);

    for (const team in normalizedTeamData) {
      pickListData[team] += normalizedTeamData[team];
      weightsData[team].push(normalizedTeamData[team]);
    }
  }

  const normalizedPickListData = normalizeTeamData(pickListData);

  const sortedPickListData = Object.keys(normalizedPickListData)
    .map((team) => ({
      team,
      teamName: surveyRecord.teams.find((t) => t.number == team)?.name || "",
      percentage: normalizedPickListData[team],
      weights: weightsDataObject(pickList, weightsData[team]),
    }))
    .toSorted((a, b) => b.percentage - a.percentage);

  return {
    type: "picklist",
    pickList,
    data: sortedPickListData,
    sortedWeights: pickList.weights.toSorted((a, b) => b.percentage - a.percentage),
    text: sortedPickListData
      .map((teamValue, index) => `${index + 1}\t${teamValue.team}\t${teamValue.percentage.toFixed(2)}%`)
      .join("\n"),
  };
}

export function getExpressionData(
  expressionName: string,
  surveyRecord: MatchSurvey,
  entriesByTeam: Record<string, IDBRecord<Entry>[]>,
  orderedSingleFields: SingleFieldWithDetails[],
): ExpressionAnalysisData | undefined {
  const expression = surveyRecord.expressions.find((e) => e.name == expressionName);
  if (!expression) return;

  const expressionData = calculateTeamData(
    expressionName,
    surveyRecord.expressions,
    entriesByTeam,
    orderedSingleFields,
  );
  const maxValue = Math.max(...Object.values(expressionData));
  const minValue = Math.min(...Object.values(expressionData));

  const sortedExpressionData = Object.keys(expressionData)
    .map((team) => ({
      team,
      teamName: surveyRecord.teams.find((t) => t.number == team)?.name || "",
      value: expressionData[team],
    }))
    .toSorted((a, b) => b.value - a.value);

  return {
    type: "expression",
    expression,
    data: sortedExpressionData,
    maxValue,
    minValue,
    text: sortedExpressionData
      .map((teamValue, index) => `${index + 1}\t${teamValue.team}\t${teamValue.value.toFixed(2)}`)
      .join("\n"),
  };
}

function weightsDataObject(pickList: PickList, weights: number[]) {
  let obj: Record<string, number> = {};
  for (let i = 0; i < weights.length; i++) {
    obj[pickList.weights[i].expressionName] = weights[i];
  }
  return obj;
}

export function calculateTeamData(
  expressionName: string,
  expressions: Expression[],
  entriesByTeam: Record<string, IDBRecord<Entry>[]>,
  orderedSingleFields: SingleFieldWithDetails[],
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
        return runEntryExpression(entry, expression, expressions, orderedSingleFields);
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

      teamData[team] = runSurveyExpression(entriesByTeam[team], expression, expressions, orderedSingleFields);
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
  orderedSingleFields: SingleFieldWithDetails[],
): number {
  const { input } = expression;

  if (input.from == "fields") {
    const values = input.fieldIds.map((id) => {
      const field = orderedSingleFields.find((f) => f.field.id == id);
      if (!field) throw new Error(`Could not find field with id ${id}`);

      return entry.values[field.valueIndex];
    });

    const valueOrValues = runExpressionMethod(expression.method, values);
    if (Array.isArray(valueOrValues)) {
      return valueOrValues.reduce((prev, curr) => prev + curr, 0) / valueOrValues.length;
    }
    return valueOrValues;
  }

  if (input.from == "tba") {
    const values = input.metrics.map((metric) => {
      if (entry.type != "match" || !entry.tbaMetrics?.length) return 0;
      return entry.tbaMetrics.find((m) => m.name == metric)?.value ?? 0;
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

      return runEntryExpression(entry, expression, expressions, orderedSingleFields);
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
  orderedSingleFields: SingleFieldWithDetails[],
): number {
  const { input } = expression;

  if (input.from == "fields") {
    const values = input.fieldIds
      .map((id) => {
        const field = orderedSingleFields.find((f) => f.field.id == id);
        if (!field) throw new Error(`Could not find field with id ${id}`);

        return entries.map((entry) => entry.values[field.valueIndex]);
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

  if (input.from == "tba") {
    const values = input.metrics
      .map((metric) => {
        return entries.map((entry) => {
          if (entry.type != "match" || !entry.tbaMetrics?.length) return 0;
          return entry.tbaMetrics.find((m) => m.name == metric)?.value ?? 0;
        });
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
          return runEntryExpression(entry, expression, expressions, orderedSingleFields);
        });

        return values.reduce((prev, curr) => prev + curr, 0) / values.length;
      }

      if (expression.scope == "survey") {
        return runSurveyExpression(entries, expression, expressions, orderedSingleFields);
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
