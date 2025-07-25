import { matchSchema, teamSchema } from "./";
import { z } from "zod";
import type { Survey } from "./survey";
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
