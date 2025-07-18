import { matchSchema, schemaVersion, teamSchema } from "./";
import { z } from "zod";
import type { Survey } from "./survey";
import { compress, decompress } from "./compress";
import type { Field } from "./field";
import type { Entry } from "./entry";

export type CompPageData = {
  compRecord: IDBRecord<Comp>;
  surveyRecords: IDBRecord<Survey>[];
  fieldRecords: IDBRecord<Field>[];
  entryRecords: IDBRecord<Entry>[];
};

export const compSchema = z.object({
  name: z.string(),
  tbaEventKey: z.optional(z.string()),
  matches: z.array(matchSchema),
  teams: z.array(teamSchema),
  scouts: z.optional(z.array(z.string())),
  created: z.coerce.date(),
  modified: z.coerce.date(),
});

export type Comp = z.infer<typeof compSchema>;

export function exportComp(compRecord: IDBRecord<Comp>) {
  const comp = {
    ...structuredClone(compRecord),
    id: undefined,
    created: undefined,
    modified: undefined,
  };

  return JSON.stringify({ version: schemaVersion, comp });
}

export function exportCompCompressed(compRecord: IDBRecord<Comp>) {
  return compress(exportComp(compRecord));
}

export function importComp(data: string): { success: true; comp: Comp } | { success: false; error: string } {
  let json: {
    version: number;
    comp: Comp & { created?: Date | undefined; modified?: Date | undefined };
  };

  try {
    json = JSON.parse(data);
  } catch (e) {
    console.error("JSON failed to parse imported comp:", data);
    return { success: false, error: e instanceof Error ? e.message : "JSON failed to parse" };
  }

  if (json.version < schemaVersion) {
    return { success: false, error: "Outdated version" };
  } else if (json.version > schemaVersion) {
    return { success: false, error: "Unsupported version" };
  }

  const comp: Comp = {
    ...json.comp,
    created: new Date(),
    modified: new Date(),
  };

  return { success: true, comp };
}

export async function importCompCompressed(data: Uint8Array) {
  return importComp(await decompress(data));
}
