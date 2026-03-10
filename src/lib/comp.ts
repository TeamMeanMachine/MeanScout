import { z } from "zod";
import { teamSchema, type TeamInsights } from "./";
import type { Entry } from "./entry";
import type { Field } from "./field";
import type { AllData } from "./idb";
import { matchSchema } from "./match";
import type { Survey } from "./survey";

const allianceSchema = z.object({
  teams: z.array(z.string()),
});
export type Alliance = z.infer<typeof allianceSchema>;

export const teamsInsightsSchema = z.object({
  oprs: z.record(z.string(), z.number()),
  dprs: z.record(z.string(), z.number()),
  ccwms: z.record(z.string(), z.number()),
  coprs: z.record(z.string(), z.record(z.string(), z.number())),
});
export type TeamsInsights = z.infer<typeof teamsInsightsSchema>;

export const compSchema = z.object({
  id: z.string(),
  name: z.string(),
  tbaEventKey: z.optional(z.string()),
  matches: z.array(matchSchema),
  teams: z.array(teamSchema),
  teamsInsights: z.optional(teamsInsightsSchema),
  alliances: z.optional(z.array(allianceSchema)),
  scouts: z.optional(z.array(z.string())),
  created: z.date().catch(() => new Date()),
  modified: z.date().catch(() => new Date()),
});

export type Comp = z.infer<typeof compSchema>;

export type CompPageData = {
  all: AllData;
  compRecord: Comp;
  surveyRecords: Survey[];
  fieldRecords: Field[];
  entryRecords: Entry[];
};

export function getTeamInsights(comp: Comp, team: string) {
  if (!comp.teamsInsights) return;

  const insights: TeamInsights = {
    opr: comp.teamsInsights.oprs[team],
    dpr: comp.teamsInsights.dprs[team],
    ccwm: comp.teamsInsights.ccwms[team],
  };

  for (const coprName in comp.teamsInsights.coprs) {
    const coprs = comp.teamsInsights.coprs[coprName];
    if (!(team in coprs)) continue;

    if (insights.coprs) {
      insights.coprs[coprName] = coprs[team];
    } else {
      insights.coprs = { [coprName]: coprs[team] };
    }
  }

  return insights;
}
