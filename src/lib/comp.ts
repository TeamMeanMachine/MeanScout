import { matchSchema, teamSchema } from "./";
import { z } from "zod";
import type { Survey } from "./survey";
import type { Field } from "./field";
import type { Entry } from "./entry";

const allianceSchema = z.object({
  teams: z.array(z.string()),
});
export type Alliance = z.infer<typeof allianceSchema>;

export const compSchema = z.object({
  id: z.string(),
  name: z.string(),
  tbaEventKey: z.optional(z.string()),
  matches: z.array(matchSchema),
  teams: z.array(teamSchema),
  alliances: z.optional(z.array(allianceSchema)),
  scouts: z.optional(z.array(z.string())),
  created: z.date(),
  modified: z.date(),
});

export type Comp = z.infer<typeof compSchema>;

export type CompPageData = {
  compRecord: Comp;
  surveyRecords: Survey[];
  fieldRecords: Field[];
  entryRecords: Entry[];
};
