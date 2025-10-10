import { z } from "zod";
import type { MatchEntry } from "./entry";
import type { SingleFieldWithDetails } from "./field";
import { type Expression, type ExpressionMethod } from "./expression";
import type { MatchSurvey } from "./survey";
import { type Value } from "./";
import type { Comp } from "./comp";

const weightSchema = z.object({ expressionName: z.string(), percentage: z.number() });

export const pickListSchema = z.object({
  name: z.string(),
  weights: z.array(weightSchema),
});
export type PickList = z.infer<typeof pickListSchema>;

type PickListTeamRank = {
  team: string;
  teamName: string;
  rank: number;
  percentage: number;
  inputs: number[];
};

type ExpressionTeamRank = {
  team: string;
  teamName: string;
  rank: number;
  value: number;
  percentage: number;
  inputs: { value: number; percentage: number }[];
};

export type TeamRank = PickListTeamRank | ExpressionTeamRank;

type PickListRankData = {
  survey: MatchSurvey;
  type: "picklist";
  pickList: PickList;
  teams: PickListTeamRank[];
  text: string;
};

type ExpressionRankData = {
  survey: MatchSurvey;
  type: "expression";
  expression: Expression;
  teams: ExpressionTeamRank[];
  text: string;
  maxValue: number;
  minValue: number;
  inputs: { name: string; maxValue: number; minValue: number }[];
};

type FieldRankData = {
  survey: MatchSurvey;
  type: "field";
  field: SingleFieldWithDetails;
  teams: ExpressionTeamRank[];
  text: string;
  maxValue: number;
  minValue: number;
  inputs: { name: string; maxValue: number; minValue: number }[];
};

export type RankData = PickListRankData | ExpressionRankData | FieldRankData;

export function getPickListData(
  compRecord: Comp,
  pickList: PickList,
  surveyRecord: MatchSurvey,
  entriesByTeam: Record<string, MatchEntry[]>,
  orderedSingleFields: SingleFieldWithDetails[],
): PickListRankData | undefined {
  const pickListData: Record<string, { value: number }> = {};
  const weightsData: Record<string, number[]> = {};

  for (const team in entriesByTeam) {
    pickListData[team] = { value: 0 };
    weightsData[team] = [];
  }

  for (const { percentage, expressionName } of pickList.weights) {
    const expression = surveyRecord.expressions.find((e) => e.name == expressionName);
    if (!expression) continue;

    const teamData = calculateTeamData(expression, surveyRecord.expressions, entriesByTeam, orderedSingleFields);
    const normalizedTeamData = normalizeTeamData(teamData, percentage);

    for (const team in normalizedTeamData) {
      pickListData[team].value += normalizedTeamData[team];
      weightsData[team].push(normalizedTeamData[team]);
    }
  }

  const normalizedPickListData = normalizeTeamData(pickListData);

  const teamRanks = Object.keys(normalizedPickListData)
    .map(
      (team): PickListTeamRank => ({
        team,
        teamName: compRecord.teams.find((t) => t.number == team)?.name || "",
        percentage: normalizedPickListData[team],
        inputs: weightsData[team],
        rank: 0,
      }),
    )
    .toSorted((a, b) => b.percentage - a.percentage)
    .map((team, index) => {
      team.rank = index + 1;
      return team;
    });

  return {
    survey: surveyRecord,
    type: "picklist",
    pickList,
    teams: teamRanks,
    text: teamRanks
      .map((teamRank, index) => `${index + 1}\t${teamRank.team}\t${teamRank.percentage.toFixed(2)}%`)
      .join("\n"),
  };
}

export function getExpressionData(
  compRecord: Comp,
  expression: Expression,
  surveyRecord: MatchSurvey,
  entriesByTeam: Record<string, MatchEntry[]>,
  orderedSingleFields: SingleFieldWithDetails[],
): ExpressionRankData | undefined {
  let inputNames: string[];
  if (expression.input.from == "expressions") {
    inputNames = expression.input.expressionNames;
  } else if (expression.input.from == "tba") {
    inputNames = expression.input.metrics;
  } else {
    inputNames = expression.input.fieldIds
      .map((id) => orderedSingleFields.find((f) => f.field.id == id)?.detailedName)
      .filter((f) => f !== undefined);
  }

  const expressionData = calculateTeamData(expression, surveyRecord.expressions, entriesByTeam, orderedSingleFields);
  const values = Object.values(expressionData).map((v) => v.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  let teamRanks = Object.keys(expressionData)
    .map(
      (team): ExpressionTeamRank => ({
        team,
        teamName: compRecord.teams.find((t) => t.number == team)?.name || "",
        value: expressionData[team].value,
        percentage: Math.abs(
          ((expressionData[team].value - Math.min(minValue, 0)) /
            (maxValue || minValue || expressionData[team].value || 1)) *
            100,
        ),
        inputs: expressionData[team].inputs.map((input) => {
          return { value: Number(input), percentage: 0 };
        }),
        rank: 0,
      }),
    )
    .toSorted((a, b) => b.value - a.value)
    .map((team, index) => {
      team.rank = index + 1;
      return team;
    });

  const inputs = inputNames.map((name, i) => {
    const inputs = teamRanks.map((teamRank) => teamRank.inputs[i]?.value ?? 0);
    const maxValue = Math.max(...inputs);
    const minValue = Math.min(...inputs);
    return { name, maxValue, minValue };
  });

  teamRanks = teamRanks.map((teamRank) => {
    teamRank.inputs = teamRank.inputs.map((input, i) => {
      input.percentage = Math.abs(
        ((input.value - Math.min(inputs[i].minValue, 0)) /
          (inputs[i].maxValue || inputs[i].minValue || input.value || 1)) *
          100,
      );
      return input;
    });
    return teamRank;
  });

  return {
    survey: surveyRecord,
    type: "expression",
    expression,
    teams: teamRanks,
    text: teamRanks.map((teamRank, index) => `${index + 1}\t${teamRank.team}\t${teamRank.value.toFixed(2)}`).join("\n"),
    maxValue,
    minValue,
    inputs,
  };
}

export function getFieldData(
  compRecord: Comp,
  singleField: SingleFieldWithDetails,
  surveyRecord: MatchSurvey,
  entriesByTeam: Record<string, MatchEntry[]>,
  orderedSingleFields: SingleFieldWithDetails[],
): FieldRankData | undefined {
  const expressionData = getExpressionData(
    compRecord,
    {
      input: { from: "fields", fieldIds: [singleField.field.id] },
      method: { type: "average" },
      name: singleField.detailedName,
      scope: "entry",
    },
    surveyRecord,
    entriesByTeam,
    orderedSingleFields,
  );

  if (!expressionData) return;

  return {
    ...expressionData,
    type: "field",
    field: singleField,
  };
}

export function calculateTeamData(
  expression: Expression,
  expressions: Expression[],
  entriesByTeam: Record<string, MatchEntry[]>,
  orderedSingleFields: SingleFieldWithDetails[],
) {
  const inputs =
    expression.input.from == "fields"
      ? expression.input.fieldIds
      : expression.input.from == "tba"
        ? expression.input.metrics
        : expression.input.from == "expressions"
          ? expression.input.expressionNames
          : [];

  const { scope } = expression;

  const teamData: Record<string, { value: number; inputs: Value[] }> = {};

  if (scope == "entry") {
    for (const team in entriesByTeam) {
      if (!entriesByTeam[team].length) {
        teamData[team] = { value: 0, inputs: [] };
        continue;
      }

      const values = mergeSameMatchEntries(entriesByTeam[team], orderedSingleFields).map((entry) => {
        return runEntryExpression(entry, expression, expressions, orderedSingleFields);
      });

      teamData[team] = {
        value: values.reduce((prev, curr) => prev + curr.value, 0) / values.length,
        inputs: inputs.map((_, i) => {
          const inputValues = values.map((v) => Number(v.inputs[i]));
          return inputValues.reduce((prev, curr) => prev + curr, 0) / inputValues.length;
        }),
      };
    }
  }

  if (scope == "survey") {
    for (const team in entriesByTeam) {
      if (!entriesByTeam[team].length) {
        teamData[team] = { value: 0, inputs: [] };
        continue;
      }

      teamData[team] = runSurveyExpression(
        mergeSameMatchEntries(entriesByTeam[team], orderedSingleFields),
        expression,
        expressions,
        orderedSingleFields,
      );
    }
  }

  return teamData;
}

export function normalizeTeamData(teamData: Record<string, { value: number }>, percentage = 100) {
  const bestValue = Math.max(...Object.values(teamData).map((v) => v.value));
  const normalizedTeamData: Record<string, number> = {};
  for (const team in teamData) {
    normalizedTeamData[team] = Math.max(0, (teamData[team].value / (bestValue || 1)) * percentage);
  }
  return normalizedTeamData;
}

function runEntryExpression(
  entry: MatchEntry,
  expression: Extract<Expression, { scope: "entry" }>,
  expressions: Expression[],
  orderedSingleFields: SingleFieldWithDetails[],
): { value: number; inputs: Value[] } {
  const { input } = expression;

  if (input.from == "fields") {
    const values = input.fieldIds.map((id) => {
      const field = orderedSingleFields.find((f) => f.field.id == id);
      if (!field) throw new Error(`Could not find field with id ${id}`);

      return entry.values[field.valueIndex];
    });

    const valueOrValues = runExpressionMethod(expression.method, values);
    if (Array.isArray(valueOrValues)) {
      return {
        value: valueOrValues.reduce((prev, curr) => prev + curr, 0) / valueOrValues.length,
        inputs: values,
      };
    }
    return {
      value: valueOrValues,
      inputs: values,
    };
  }

  if (input.from == "tba") {
    const values = input.metrics.map((metric) => {
      if (!entry.tbaMetrics?.length) return 0;
      return entry.tbaMetrics.find((m) => m.name == metric)?.value ?? 0;
    });

    const valueOrValues = runExpressionMethod(expression.method, values);
    if (Array.isArray(valueOrValues)) {
      return {
        value: valueOrValues.reduce((prev, curr) => prev + curr, 0) / valueOrValues.length,
        inputs: values,
      };
    }
    return {
      value: valueOrValues,
      inputs: values,
    };
  }

  if (input.from == "expressions") {
    const values = input.expressionNames.map((expressionName) => {
      const expression = expressions.find((e) => e.name == expressionName);
      if (!expression) throw new Error(`Could not find expression named ${expressionName}`);
      if (expression.scope != "entry") throw new Error("Invalid expression scope");

      return runEntryExpression(entry, expression, expressions, orderedSingleFields);
    });

    const valueOrValues = runExpressionMethod(
      expression.method,
      values.map((v) => v.value),
    );
    if (Array.isArray(valueOrValues)) {
      return {
        value: valueOrValues.reduce((prev, curr) => prev + curr, 0) / valueOrValues.length,
        inputs: values.map((v) => v.value),
      };
    }
    return {
      value: valueOrValues,
      inputs: values.map((v) => v.value),
    };
  }

  throw new Error("Invalid expression input");
}

function runSurveyExpression(
  entries: MatchEntry[],
  expression: Extract<Expression, { scope: "survey" }>,
  expressions: Expression[],
  orderedSingleFields: SingleFieldWithDetails[],
): { value: number; inputs: Value[] } {
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

    return {
      value: values.reduce((prev, curr) => prev + curr, 0) / values.length,
      inputs: values,
    };
  }

  if (input.from == "tba") {
    const values = input.metrics
      .map((metric) => {
        return entries.map((entry) => {
          if (!entry.tbaMetrics?.length) return 0;
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

    return {
      value: values.reduce((prev, curr) => prev + curr, 0) / values.length,
      inputs: values,
    };
  }

  if (input.from == "expressions") {
    const values = input.expressionNames.map((expressionName) => {
      const expression = expressions.find((e) => e.name == expressionName);
      if (!expression) throw new Error(`Could not find expression named ${expressionName}`);

      if (expression.scope == "entry") {
        const values = entries
          .map((entry) => runEntryExpression(entry, expression, expressions, orderedSingleFields))
          .map((v) => (typeof v == "number" ? v : v.value));

        return values.reduce((prev, curr) => prev + curr, 0) / values.length;
      }

      if (expression.scope == "survey") {
        return runSurveyExpression(entries, expression, expressions, orderedSingleFields);
      }

      throw new Error("Invalid expression scope");
    });

    const eachValue = values.map((v) => (typeof v == "number" ? v : v.value));

    const valueOrValues = runExpressionMethod(expression.method, eachValue);
    if (Array.isArray(valueOrValues)) {
      return {
        value: valueOrValues.reduce((prev, curr) => prev + curr, 0) / valueOrValues.length,
        inputs: eachValue,
      };
    }
    return {
      value: valueOrValues,
      inputs: eachValue,
    };
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
        return method.defaultTo ?? value;
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

function mergeSameMatchEntries(entries: MatchEntry[], orderedSingleFields: SingleFieldWithDetails[]): MatchEntry[] {
  return Map.groupBy(entries, ({ match }) => match)
    .values()
    .toArray()
    .map((entries) => {
      if (entries.length == 1) {
        return entries[0];
      }

      const mergedValues: Value[] = [];

      for (let i = 0; i < entries[0].values.length; i++) {
        switch (orderedSingleFields[i].field.type) {
          case "number":
          case "rating":
          case "timer":
            const numberValues = entries.map((e) => e.values[i]) as number[];
            mergedValues.push(numberValues.reduce((prev, curr) => prev + curr, 0) / (numberValues.length || 1));
            break;
          case "toggle":
            const booleanValues = entries.map((e) => e.values[i]) as boolean[];
            mergedValues.push(
              booleanValues.reduce((prev, curr) => prev + Number(curr), 0) / (booleanValues.length || 1) >= 0.5,
            );
            break;
          case "select":
          case "text":
            const stringValues = entries.map((e) => e.values[i]) as string[];
            const stringCounts = new Map<string, number>();

            for (const stringValue of stringValues) {
              const thisStringCount = stringCounts.get(stringValue);
              stringCounts.set(stringValue, (thisStringCount || 0) + 1);
            }

            let mostCommonString = "";
            let highestCount = 0;

            for (const [string, count] of stringCounts) {
              if (count > highestCount) {
                highestCount = count;
                mostCommonString = string;
              }
            }

            mergedValues.push(mostCommonString);
            break;
        }
      }

      return { ...entries[0], values: mergedValues };
    });
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
