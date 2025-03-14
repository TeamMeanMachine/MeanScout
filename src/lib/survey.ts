import { matchSchema, schemaVersion, teamSchema } from "./";
import { z } from "zod";
import { pickListSchema } from "./analysis";
import type { Field } from "./field";
import { compress, decompress } from "./compress";
import { expressionSchema } from "./expression";
import type { Entry } from "./entry";

export const surveyTypes = ["match", "pit"] as const;
export type SurveyType = (typeof surveyTypes)[number];

const baseSurveySchema = z.object({
  name: z.string(),
  tbaEventKey: z.optional(z.string()),
  fieldIds: z.array(z.number()),
  matches: z.array(matchSchema),
  teams: z.array(teamSchema),
  scouts: z.optional(z.array(z.string())),
  created: z.coerce.date(),
  modified: z.coerce.date(),
});

const matchSurveySchema = baseSurveySchema.merge(
  z.object({
    type: z.literal("match"),
    pickLists: z.array(pickListSchema),
    expressions: z.array(expressionSchema),
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

export function exportSurvey(surveyRecord: IDBRecord<Survey>, fieldRecords: IDBRecord<Field>[]) {
  const survey = {
    ...structuredClone(surveyRecord),
    id: undefined,
    created: undefined,
    modified: undefined,
  };

  const fieldIdMap = new Map<number, number>();

  const fields = fieldRecords
    .map((field, index) => {
      fieldIdMap.set(field.id, index);
      return { ...field, surveyId: undefined };
    })
    .map((field) => {
      if (field.type == "group") {
        field.fieldIds = field.fieldIds.map((id) => fieldIdMap.get(id)!);
      }
      field.id = fieldIdMap.get(field.id)!;
      return field;
    });

  survey.fieldIds = survey.fieldIds.map((id) => fieldIdMap.get(id)!);

  if (survey.type == "match") {
    survey.expressions = survey.expressions.map((e) => {
      if (e.input.from == "fields") {
        e.input.fieldIds = e.input.fieldIds.map((id) => fieldIdMap.get(id)!);
      }
      return e;
    });
  }

  return JSON.stringify({ version: schemaVersion, survey, fields });
}

export function exportSurveyCompressed(surveyRecord: IDBRecord<Survey>, fieldRecords: IDBRecord<Field>[]) {
  return compress(exportSurvey(surveyRecord, fieldRecords));
}

export function importSurvey(
  data: string,
): { success: true; survey: Survey; fields: Map<number, Field> } | { success: false; error: string } {
  let json: {
    version: number;
    survey: Survey & { created?: Date | undefined; modified?: Date | undefined };
    fields: IDBRecord<Field & { surveyId?: number | undefined }>[];
  };

  try {
    json = JSON.parse(data);
  } catch (e) {
    console.error("JSON failed to parse imported survey:", data);
    return { success: false, error: e instanceof Error ? e.message : "JSON failed to parse" };
  }

  if (json.version < schemaVersion) {
    return { success: false, error: "Outdated version" };
  } else if (json.version > schemaVersion) {
    return { success: false, error: "Unsupported version" };
  }

  if (!surveyTypes.includes(json.survey.type)) {
    return { success: false, error: "Invalid survey type" };
  }

  const survey: Survey = {
    ...json.survey,
    created: new Date(),
    modified: new Date(),
  };

  const fields = new Map<number, Field>();

  for (const fieldId of json.survey.fieldIds) {
    const field = json.fields.find((field) => field.id == fieldId);
    if (!field) continue;
    if (field.type == "group") {
      for (const innerFieldId of field.fieldIds) {
        const innerField = json.fields.find((field) => field.id == innerFieldId);
        if (!innerField) continue;
        delete (innerField as any).id;
        fields.set(innerFieldId, { ...innerField, surveyId: 0 });
      }
    }
    delete (field as any).id;
    fields.set(fieldId, { ...field, surveyId: 0 });
  }

  return { success: true, survey, fields };
}

export async function importSurveyCompressed(data: Uint8Array) {
  return importSurvey(await decompress(data));
}

export function getLastCompletedMatch(survey: Survey, entries: Entry[]) {
  let lastCompletedMatch = 0;

  if (survey.type == "match") {
    for (const match of survey.matches) {
      if (entries.some((e) => e.type == "match" && e.status != "draft" && e.match == match.number)) {
        lastCompletedMatch = Math.max(lastCompletedMatch, match.number);
      }
    }
  } else if (survey.type == "pit") {
    for (const match of survey.matches) {
      if (match.redScore && match.blueScore) {
        lastCompletedMatch = Math.max(lastCompletedMatch, match.number);
      }
    }
  }

  return lastCompletedMatch;
}
