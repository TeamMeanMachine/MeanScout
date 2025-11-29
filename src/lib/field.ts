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
  id: z.string(),
  surveyId: z.string(),
  name: z.string(),
  tip: z.optional(z.string()),
});

const toggleFieldSchema = z.object({
  ...baseSingleFieldSchema.shape,
  type: z.literal("toggle"),
});
export type ToggleField = z.infer<typeof toggleFieldSchema>;

const numberFieldSchema = z.object({
  ...baseSingleFieldSchema.shape,
  type: z.literal("number"),
  allowNegative: z.optional(z.boolean()),
});
export type NumberField = z.infer<typeof numberFieldSchema>;

const selectFieldSchema = z.object({
  ...baseSingleFieldSchema.shape,
  type: z.literal("select"),
  values: z.array(z.string()),
  radio: z.optional(z.boolean()),
});
export type SelectField = z.infer<typeof selectFieldSchema>;

const textFieldSchema = z.object({
  ...baseSingleFieldSchema.shape,
  type: z.literal("text"),
  long: z.optional(z.boolean()),
});
export type TextField = z.infer<typeof textFieldSchema>;

const ratingFieldSchema = z.object({
  ...baseSingleFieldSchema.shape,
  type: z.literal("rating"),
});
export type RatingField = z.infer<typeof ratingFieldSchema>;

const timerFieldSchema = z.object({
  ...baseSingleFieldSchema.shape,
  type: z.literal("timer"),
});
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
  id: z.string(),
  surveyId: z.string(),
  name: z.string(),
  type: z.literal("group"),
  fieldIds: z.array(z.string()),
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

export type SingleFieldWithDetails = {
  type: "single";
  field: SingleField;
  detailedName: string;
  valueIndex: number;
};

export type GroupFieldWithDetails = {
  type: "group";
  field: GroupField;
};

export function getFieldsWithDetails(surveyRecord: Survey, fieldRecords: Field[]) {
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

export function isNumericField(field: Field | SingleFieldWithDetails | GroupFieldWithDetails) {
  const type = "field" in field ? field.field.type : field.type;
  return ["number", "toggle", "rating", "timer"].includes(type);
}
