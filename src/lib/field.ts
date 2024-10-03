import { z } from "zod";

export const singleFieldTypes = ["toggle", "number", "select", "text", "rating", "timer"] as const;
export type SingleFieldType = (typeof singleFieldTypes)[number];

export const fieldTypes = [...singleFieldTypes, "group"] as const;
export type FieldType = (typeof fieldTypes)[number];

const toggleFieldSchema = z.object({
  name: z.string(),
  type: z.literal("toggle"),
  tip: z.optional(z.string()),
});
export type ToggleField = z.infer<typeof toggleFieldSchema>;

const numberFieldSchema = z.object({
  name: z.string(),
  type: z.literal("number"),
  allowNegative: z.optional(z.boolean()),
  tip: z.optional(z.string()),
});
export type NumberField = z.infer<typeof numberFieldSchema>;

const selectFieldSchema = z.object({
  name: z.string(),
  type: z.literal("select"),
  values: z.array(z.string()),
  tip: z.optional(z.string()),
});
export type SelectField = z.infer<typeof selectFieldSchema>;

const textFieldSchema = z.object({
  name: z.string(),
  type: z.literal("text"),
  long: z.optional(z.boolean()),
  tip: z.optional(z.string()),
});
export type TextField = z.infer<typeof textFieldSchema>;

const ratingFieldSchema = z.object({
  name: z.string(),
  type: z.literal("rating"),
  tip: z.optional(z.string()),
});
export type RatingField = z.infer<typeof ratingFieldSchema>;

const timerFieldSchema = z.object({
  name: z.string(),
  type: z.literal("timer"),
  tip: z.optional(z.string()),
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

const groupFieldSchema = z.object({ name: z.string(), type: z.literal("group"), fields: z.array(singleFieldSchema) });
export type GroupField = z.infer<typeof groupFieldSchema>;

export const fieldSchema = z.discriminatedUnion("type", [...singleFieldSchema.options, groupFieldSchema]);
export type Field = z.infer<typeof fieldSchema>;

export const fieldIcons: Record<FieldType, string> = {
  toggle: "check",
  number: "hashtag",
  select: "square-caret-down",
  text: "font",
  rating: "star",
  timer: "clock",
  group: "list-check",
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

export function flattenFields(fields: Field[]) {
  return fields.flatMap((field) => (field.type == "group" ? field.fields : field));
}

export function countPreviousFields(index: number, fields: Field[]) {
  return flattenFields(fields.slice(0, index)).length;
}

export function getDetailedFieldName(fields: Field[], flattenedFieldIndex: number) {
  let flattenedFieldCount = 0;
  for (const field of fields) {
    if (field.type == "group") {
      for (const subField of field.fields) {
        if (flattenedFieldCount == flattenedFieldIndex) {
          return `${field.name} ${subField.name}`;
        }
        flattenedFieldCount++;
      }
    } else {
      if (flattenedFieldCount == flattenedFieldIndex) {
        return field.name;
      }
      flattenedFieldCount++;
    }
  }
  return "";
}
