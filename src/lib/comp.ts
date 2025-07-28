import { matchSchema, teamSchema } from "./";
import { z } from "zod";

export const compSchema = z.object({
  id: z.string(),
  name: z.string(),
  tbaEventKey: z.optional(z.string()),
  matches: z.array(matchSchema),
  teams: z.array(teamSchema),
  scouts: z.optional(z.array(z.string())),
  created: z.coerce.date(),
  modified: z.coerce.date(),
});

export type Comp = z.infer<typeof compSchema>;
