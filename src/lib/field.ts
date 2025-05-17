import { z } from "zod";
import type { Survey } from "./survey";
import {
  GroupIcon,
  HashIcon,
  SquareCheckBigIcon,
  CircleChevronDownIcon,
  StarIcon,
  TextCursorInputIcon,
  TimerIcon,
  type Icon,
} from "@lucide/svelte";

export const singleFieldTypes = ["toggle", "number", "select", "text", "rating", "timer"] as const;
export type SingleFieldType = (typeof singleFieldTypes)[number];

export const fieldTypes = [...singleFieldTypes, "group"] as const;
export type FieldType = (typeof fieldTypes)[number];

const baseSingleFieldSchema = z.object({
  surveyId: z.number(),
  name: z.string(),
  tip: z.optional(z.string()),
});

const toggleFieldSchema = baseSingleFieldSchema.merge(
  z.object({
    type: z.literal("toggle"),
  }),
);
export type ToggleField = z.infer<typeof toggleFieldSchema>;

const numberFieldSchema = baseSingleFieldSchema.merge(
  z.object({
    type: z.literal("number"),
    allowNegative: z.optional(z.boolean()),
  }),
);
export type NumberField = z.infer<typeof numberFieldSchema>;

const selectFieldSchema = baseSingleFieldSchema.merge(
  z.object({
    type: z.literal("select"),
    values: z.array(z.string()),
    radio: z.optional(z.boolean()),
  }),
);
export type SelectField = z.infer<typeof selectFieldSchema>;

const textFieldSchema = baseSingleFieldSchema.merge(
  z.object({
    type: z.literal("text"),
    long: z.optional(z.boolean()),
  }),
);
export type TextField = z.infer<typeof textFieldSchema>;

const ratingFieldSchema = baseSingleFieldSchema.merge(
  z.object({
    type: z.literal("rating"),
  }),
);
export type RatingField = z.infer<typeof ratingFieldSchema>;

const timerFieldSchema = baseSingleFieldSchema.merge(
  z.object({
    type: z.literal("timer"),
  }),
);
export type TimerField = z.infer<typeof timerFieldSchema>;

const singleFieldSchema = z.discriminatedUnion("type", [
  toggleFieldSchema,
  numberFieldSchema,
  selectFieldSchema,
  textFieldSchema,
  ratingFieldSchema,
  timerFieldSchema,
]);
export type SingleField = z.infer<typeof singleFieldSchema>;

const groupFieldSchema = z.object({
  surveyId: z.number(),
  name: z.string(),
  type: z.literal("group"),
  fieldIds: z.array(z.number()),
});
export type GroupField = z.infer<typeof groupFieldSchema>;

export const fieldSchema = z.discriminatedUnion("type", [...singleFieldSchema.options, groupFieldSchema]);
export type Field = z.infer<typeof fieldSchema>;

export const fieldIcons: Record<FieldType, typeof Icon> = {
  toggle: SquareCheckBigIcon,
  number: HashIcon,
  select: CircleChevronDownIcon,
  text: TextCursorInputIcon,
  rating: StarIcon,
  timer: TimerIcon,
  group: GroupIcon,
};

export function getDefaultFieldValue(field: SingleField) {
  switch (field.type) {
    case "toggle":
      return false;
    case "number":
      return 0;
    case "select":
      return field.values[0];
    case "text":
      return "";
    case "rating":
      return 0;
    case "timer":
      return 0;
    default:
      const unhandledType: never = field;
      throw new Error(`Unhandled type for field ${unhandledType}`);
  }
}

export function addField(
  fieldStore: IDBObjectStore,
  fields: Map<number, Field>,
  oldNewMap: Map<number, number>,
  fieldId: number,
  surveyId: number,
) {
  return new Promise<number>(async (resolve, reject) => {
    const field = fields.get(fieldId);
    if (!field) return reject(`Could not add field with id ${fieldId} for survey id ${surveyId}`);

    if (field.type == "group") {
      const newIds: number[] = [];

      for (const nestedFieldId of field.fieldIds) {
        try {
          const addedNestedFieldId = await addField(fieldStore, fields, oldNewMap, nestedFieldId, surveyId);
          newIds.push(addedNestedFieldId);
          oldNewMap.set(nestedFieldId, addedNestedFieldId);
        } catch (error) {
          return reject(error);
        }
      }

      field.fieldIds = newIds;
    }

    const request = fieldStore.add({ ...field, surveyId });
    request.onerror = () => reject(`Could not add field ${field.name} for survey id ${surveyId}`);
    request.onsuccess = () => resolve(request.result as number);
  });
}

export type SingleFieldWithDetails = {
  type: "single";
  field: IDBRecord<SingleField>;
  detailedName: string;
  valueIndex: number;
};

export type GroupFieldWithDetails = {
  type: "group";
  field: IDBRecord<GroupField>;
};

export function getFieldsWithDetails(surveyRecord: IDBRecord<Survey>, fieldRecords: IDBRecord<Field>[]) {
  const topLevel: (SingleFieldWithDetails | GroupFieldWithDetails)[] = [];
  const nested: SingleFieldWithDetails[] = [];
  const orderedSingle: SingleFieldWithDetails[] = [];

  const topLevelFields = surveyRecord.fieldIds
    .map((id) => fieldRecords.find((f) => f.id == id))
    .filter((f) => f !== undefined);

  let valueIndex = 0;

  for (const field of topLevelFields) {
    if (field.type == "group") {
      const nestedFields = field.fieldIds
        .map((id) => fieldRecords.find((f) => f.id == id))
        .filter((f) => f !== undefined && f.type != "group");

      topLevel.push({ type: "group", field });

      for (const nestedField of nestedFields) {
        const fieldWithDetails: SingleFieldWithDetails = {
          type: "single",
          field: nestedField,
          detailedName: `${field.name} ${nestedField.name}`,
          valueIndex,
        };

        nested.push(fieldWithDetails);
        orderedSingle.push(fieldWithDetails);
        valueIndex++;
      }
    } else {
      const fieldWithDetails: SingleFieldWithDetails = {
        type: "single",
        field,
        detailedName: field.name,
        valueIndex,
      };

      topLevel.push(fieldWithDetails);
      orderedSingle.push(fieldWithDetails);
      valueIndex++;
    }
  }

  return { topLevel, nested, orderedSingle };
}
