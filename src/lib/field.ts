export const fieldTypes = ["toggle", "number", "select", "text", "rating", "timer", "group"] as const;
export type FieldType = (typeof fieldTypes)[number];

type BaseField<T extends FieldType> = {
  name: string;
  type: T;
};

type ToggleField = BaseField<"toggle">;
type NumberField = BaseField<"number"> & { allowNegative?: boolean };
type SelectField = BaseField<"select"> & { values: string[] };
type TextField = BaseField<"text"> & { long?: boolean; tip?: string };
type RatingField = BaseField<"rating">;
type TimerField = BaseField<"timer">;
type GroupField = BaseField<"group"> & { fields: Exclude<Field, GroupField>[] };

export type Field = ToggleField | NumberField | SelectField | TextField | RatingField | TimerField | GroupField;

export function getDefaultFieldValue(field: Exclude<Field, GroupField>) {
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

export function isValidField(field: any) {
  if (typeof field != "object") return false;
  if (typeof field.name != "string" || !field.name.trim()) return false;

  if (!fieldTypes.includes(field.type)) return false;
  if (field.type == "select" && !Array.isArray(field.values)) return false;
  if (field.type == "group" && !Array.isArray(field.fields)) return false;

  return true;
}
