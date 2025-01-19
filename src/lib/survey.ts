import { matchSchema, schemaVersion, teamSchema } from "./";
import { z } from "zod";
import { pickListSchema } from "./analysis";
import type { Field } from "./field";
import { compress, decompress } from "./compress";
import { expressionSchema } from "./expression";

export const surveyTypes = ["match", "pit"] as const;
export type SurveyType = (typeof surveyTypes)[number];

const baseSurveySchema = z.object({
  name: z.string(),
  tbaEventKey: z.optional(z.string()),
  fieldIds: z.array(z.number()),
  teams: z.array(teamSchema),
  created: z.coerce.date(),
  modified: z.coerce.date(),
});

const matchSurveySchema = baseSurveySchema.merge(
  z.object({
    type: z.literal("match"),
    matches: z.array(matchSchema),
    expressions: z.array(expressionSchema),
    pickLists: z.array(pickListSchema),
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

  const fields = fieldRecords.map((field) => {
    return { ...structuredClone(field), surveyId: undefined };
  });

  return JSON.stringify({ version: schemaVersion, survey, fields });
}

export function exportSurveyCompressed(surveyRecord: IDBRecord<Survey>, fieldRecords: IDBRecord<Field>[]) {
  return compress(exportSurvey(surveyRecord, fieldRecords));
}

export function importSurvey(
  data: string,
): { success: true; survey: Survey; fields: Map<number, Field> } | { success: false; error: string } {
  const json: {
    version: number;
    survey: Survey & { created?: Date | undefined; modified?: Date | undefined };
    fields: IDBRecord<Field & { surveyId?: number | undefined }>[];
  } = JSON.parse(data);

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
        fields.set(innerFieldId, { ...innerField, surveyId: 0 });
      }
    }
    fields.set(fieldId, { ...field, surveyId: 0 });
  }

  return { success: true, survey, fields };
}

export async function importSurveyCompressed(data: Uint8Array) {
  return importSurvey(await decompress(data));
}
