import { matchSchema, parseValueFromString, type Match, type Value } from "$lib";
import { z } from "zod";
import {
  expressionSchema,
  expressionTypes,
  pickListSchema,
  type ConvertExpression,
  type Expression,
  type PickList,
} from "./analysis";
import { fieldSchema, fieldTypes, singleFieldTypes, type Field, type SingleField } from "./field";

export const surveyTypes = ["match", "pit"] as const;
export type SurveyType = (typeof surveyTypes)[number];

const baseSurveySchema = z.object({
  name: z.string(),
  tbaEventKey: z.optional(z.string()),
  fields: z.array(fieldSchema),
  teams: z.array(z.coerce.string()),
  created: z.coerce.date(),
  modified: z.coerce.date(),
});

const matchSurveySchema = baseSurveySchema.merge(
  z.object({
    type: z.literal("match"),
    matches: z.array(matchSchema),
    expressions: z.array(expressionSchema),
    pickLists: z.array(pickListSchema),
    skippedTeams: z.optional(z.array(z.coerce.string())),
  }),
);
export type MatchSurvey = z.infer<typeof matchSurveySchema>;

const pitSurveySchema = baseSurveySchema.merge(
  z.object({
    type: z.literal("pit"),
  }),
);
export type PitSurvey = z.infer<typeof pitSurveySchema>;

export const surveySchema = z.discriminatedUnion("type", [matchSurveySchema, pitSurveySchema]);
export type Survey = z.infer<typeof surveySchema>;

function compressField(field: SingleField) {
  const typeNumber = fieldTypes.findIndex((type) => type == field.type);
  const compressedField: Value[] = [typeNumber, field.name, field.tip || ""];

  if (field.type == "number") {
    if (field.allowNegative) {
      compressedField.push(1);
    }
  } else if (field.type == "select") {
    compressedField.push(field.values.join(","));
  } else if (field.type == "text") {
    if (field.long) {
      compressedField.push(1);
    }
  }

  return compressedField.join(",");
}

export function surveyToJSON(surveyRecord: IDBRecord<Survey>) {
  const survey = { ...structuredClone(surveyRecord), id: undefined, created: undefined, modified: undefined };

  const indexedTeams: string[] = [];

  const teams: number[] = [];
  for (const team of survey.teams) {
    let index = indexedTeams.findIndex((t) => team == t);
    if (index == -1) {
      index = indexedTeams.push(team) - 1;
    }
    teams.push(index);
  }

  const fields = [];
  for (const field of survey.fields) {
    if (field.type == "group") {
      const typeNumber = fieldTypes.findIndex((type) => type == "group");
      const compressedField: any[] = [typeNumber, field.name];
      for (const innerField of field.fields) {
        compressedField.push(compressField(innerField));
      }
      fields.push(compressedField);
    } else {
      fields.push(compressField(field));
    }
  }

  let compressedSurvey;

  if (survey.type == "match") {
    const matches: number[] = [];
    for (const match of survey.matches.toSorted((a, b) => a.number - b.number)) {
      const indexes: number[] = [];
      for (const team of [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3]) {
        let index = indexedTeams.findIndex((t) => team == t);
        if (index == -1) {
          index = indexedTeams.push(team) - 1;
        }
        indexes.push(index);
      }
      matches.push(match.number, ...indexes);
    }

    let skippedTeams: number[] | undefined = undefined;
    if (survey.skippedTeams?.length) {
      skippedTeams = [];
      for (const team of survey.skippedTeams) {
        const index = indexedTeams.findIndex((t) => team == t);
        if (index > -1) {
          skippedTeams.push(index);
        }
      }
    }

    const expressionNames: string[] = [];

    const expressions: any[] = [];
    for (const expression of survey.expressions) {
      const typeNumber = expressionTypes.findIndex((type) => type == expression.type);
      let nameIndex = expressionNames.findIndex((e) => expression.name == e);
      if (nameIndex == -1) {
        nameIndex = expressionNames.push(expression.name) - 1;
      }
      const compressedExpression: any[] = [typeNumber, nameIndex];
      if (expression.type == "count") {
        compressedExpression.push(expression.valueToCount);
      } else if (expression.type == "convert") {
        compressedExpression.push(expression.defaultTo);
        compressedExpression.push(expression.converters.flatMap(({ from, to }) => [from, to]).join(","));
      } else if (expression.type == "multiply") {
        compressedExpression.push(expression.multiplier);
      } else if (expression.type == "divide") {
        compressedExpression.push(expression.divisor);
      }
      const inputs: string[] = [];
      for (const input of expression.inputs) {
        if (input.from == "field") {
          inputs.push("f" + input.fieldIndex);
        } else if (input.from == "expression") {
          let nameIndex = expressionNames.findIndex((e) => input.expressionName == e);
          if (nameIndex == -1) {
            nameIndex = expressionNames.push(input.expressionName) - 1;
          }
          inputs.push("e" + nameIndex);
        }
      }
      compressedExpression.push(inputs.join(","));
      expressions.push(compressedExpression);
    }

    const pickLists = [];
    for (const pickList of survey.pickLists) {
      const compressedPickList: any[] = [pickList.name];
      for (const weight of pickList.weights) {
        let nameIndex = expressionNames.findIndex((e) => weight.expressionName == e);
        if (nameIndex == -1) {
          nameIndex = expressionNames.push(weight.expressionName) - 1;
        }
        compressedPickList.push(nameIndex, weight.percentage);
      }
      pickLists.push(compressedPickList);
    }

    compressedSurvey = {
      ...survey,
      fields,
      indexedTeams: indexedTeams.join(","),
      teams: teams.length ? teams : undefined,
      expressionNames: expressionNames.join(","),
      pickLists: pickLists.length ? pickLists : undefined,
      expressions: expressions.length ? expressions : undefined,
      matches: matches.length ? matches : undefined,
      skippedTeams,
    };
  } else {
    compressedSurvey = {
      ...survey,
      fields,
      indexedTeams: indexedTeams.join(","),
      teams: teams.length ? teams : undefined,
    };
  }

  return JSON.stringify(compressedSurvey);
}

function uncompressField(field: any) {
  const [type, name, tip, ...rest] = field.split(",");
  const fieldType = singleFieldTypes[Number(type)];
  let newField: SingleField;
  if (fieldType == "number") {
    newField = { name, type: fieldType };
    if (rest.length) {
      newField.allowNegative = true;
    }
  } else if (fieldType == "select") {
    newField = { name, type: fieldType, values: rest };
  } else if (fieldType == "text") {
    newField = { name, type: fieldType };
    if (rest.length) {
      newField.long = true;
    }
  } else {
    newField = { name, type: fieldType };
  }
  if (tip) {
    newField.tip = tip;
  }
  return newField;
}

export function jsonToSurvey(json: string): { success: true; survey: Survey } | { success: false; error: string } {
  let survey: Survey;
  let compressedSurvey: any;

  try {
    compressedSurvey = JSON.parse(json.trim());
  } catch (e) {
    return { success: false, error: "Invalid input" };
  }

  const fields: Field[] = [];
  if (compressedSurvey.fields?.length) {
    for (const field of compressedSurvey.fields) {
      if (typeof field == "string") {
        fields.push(uncompressField(field));
      } else if (Array.isArray(field)) {
        const [, name, ...innerFields] = field;
        const newInnerFields: SingleField[] = [];
        for (const innerField of innerFields) {
          newInnerFields.push(uncompressField(innerField));
        }
        fields.push({ name, type: "group", fields: newInnerFields });
      }
    }
  }

  let indexedTeams: string[] = [];
  if (compressedSurvey.indexedTeams.length) {
    indexedTeams = compressedSurvey.indexedTeams.split(",");
  }

  const teams: string[] = [];
  if (compressedSurvey.teams?.length && indexedTeams.length) {
    for (const teamIndex of compressedSurvey.teams) {
      teams.push(indexedTeams[teamIndex]);
    }
  }

  if (compressedSurvey.type == "match") {
    let expressionNames: string[] = [];
    if (compressedSurvey.expressionNames.length) {
      expressionNames = compressedSurvey.expressionNames.split(",");
    }

    const expressions: Expression[] = [];
    if (compressedSurvey.expressions?.length) {
      for (const expression of compressedSurvey.expressions) {
        const type = expressionTypes[expression[0]];
        const name = expressionNames[expression[1]];
        let inputsIndex = 2;
        if (type == "count") {
          inputsIndex = 3;
        } else if (type == "convert") {
          inputsIndex = 4;
        } else if (type == "multiply") {
          inputsIndex = 3;
        } else if (type == "divide") {
          inputsIndex = 3;
        }
        const inputs: Expression["inputs"] = [];
        for (const input of expression[inputsIndex].split(",")) {
          const from = input[0];
          const index = Number(input.slice(1));
          if (from == "f") {
            inputs.push({ from: "field", fieldIndex: index });
          } else if (from == "e") {
            inputs.push({ from: "expression", expressionName: expressionNames[index] });
          }
        }
        if (type == "count") {
          expressions.push({ name, type, inputs, valueToCount: expression[2] });
        } else if (type == "convert") {
          const compressedConverters = expression[3].split(",").map(parseValueFromString);
          const converters: ConvertExpression["converters"] = [];
          for (let i = 0; i < compressedConverters.length; i += 2) {
            converters.push({ from: compressedConverters[i], to: compressedConverters[i + 1] });
          }
          expressions.push({ name, type, inputs, defaultTo: expression[2], converters });
        } else if (type == "multiply") {
          expressions.push({ name, type, inputs, multiplier: expression[2] });
        } else if (type == "divide") {
          expressions.push({ name, type, inputs, divisor: expression[2] });
        } else {
          expressions.push({ name, type, inputs });
        }
      }
    }

    const pickLists: PickList[] = [];
    if (compressedSurvey.pickLists?.length) {
      for (const pickList of compressedSurvey.pickLists) {
        const weights: PickList["weights"] = [];
        for (let i = 1; i < pickList.length; i += 2) {
          weights.push({ expressionName: expressionNames[pickList[i]], percentage: pickList[i + 1] });
        }
        pickLists.push({ name: pickList[0], weights });
      }
    }

    const matches: Match[] = [];
    if (compressedSurvey.matches?.length) {
      for (let i = 0; i < compressedSurvey.matches.length; i += 7) {
        matches.push({
          number: compressedSurvey.matches[i],
          red1: indexedTeams[compressedSurvey.matches[i + 1]],
          red2: indexedTeams[compressedSurvey.matches[i + 2]],
          red3: indexedTeams[compressedSurvey.matches[i + 3]],
          blue1: indexedTeams[compressedSurvey.matches[i + 4]],
          blue2: indexedTeams[compressedSurvey.matches[i + 5]],
          blue3: indexedTeams[compressedSurvey.matches[i + 6]],
        });
      }
    }

    let skippedTeams: string[] | undefined;
    if (compressedSurvey.skippedTeams?.length) {
      skippedTeams = [];
      for (const team of compressedSurvey.skippedTeams) {
        skippedTeams.push(indexedTeams[team]);
      }
    }

    survey = {
      name: compressedSurvey.name,
      type: "match",
      created: new Date(),
      modified: new Date(),
      fields,
      teams,
      pickLists,
      expressions,
      matches,
    };

    if (skippedTeams?.length) {
      survey.skippedTeams = skippedTeams;
    }
  } else if (compressedSurvey.type == "pit") {
    survey = {
      name: compressedSurvey.name,
      type: "pit",
      created: new Date(),
      modified: new Date(),
      fields,
      teams,
    };
  } else {
    return { success: false, error: "Invalid input" };
  }

  if (compressedSurvey.tbaEventKey) {
    survey.tbaEventKey = compressedSurvey.tbaEventKey;
  }

  return { success: true, survey };
}
