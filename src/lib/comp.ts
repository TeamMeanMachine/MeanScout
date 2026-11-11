import { z } from "zod";
import { convertOprToLabel, serializeDate, teamSchema, type TeamInsights } from "#lib";
import type { Entry } from "#lib/entry.ts";
import type { Field } from "#lib/field.ts";
import type { AllData } from "#lib/idb.ts";
import { matchSchema } from "#lib/match.ts";
import type { Survey } from "#lib/survey.ts";

export const teamsRemapsSchema = z.record(z.string(), z.string());
export type TeamsRemaps = z.infer<typeof teamsRemapsSchema>;

export const teamsInsightsSchema = z.object({
  oprs: z.record(z.string(), z.number()),
  dprs: z.record(z.string(), z.number()),
  ccwms: z.record(z.string(), z.number()),
  coprs: z.record(z.string(), z.record(z.string(), z.number())),
});
export type TeamsInsights = z.infer<typeof teamsInsightsSchema>;

const allianceSchema = z.object({
  teams: z.array(z.string()),
});
export type Alliance = z.infer<typeof allianceSchema>;

export const compSchema = z.object({
  id: z.string(),
  name: z.string(),
  tbaEventKey: z.optional(z.string()),
  matches: z.array(matchSchema),
  teamsRemaps: z.optional(teamsRemapsSchema),
  teams: z.array(teamSchema),
  teamsInsights: z.optional(teamsInsightsSchema),
  alliances: z.optional(z.array(allianceSchema)),
  scouts: z.optional(z.array(z.string())),
  created: z.number().catch((ctx) => serializeDate(ctx.value)),
  modified: z.number().catch((ctx) => serializeDate(ctx.value)),
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

export function getTeamsInsights(comp: Comp) {
  if (!comp.teamsInsights) {
    return { oprs: [], coprs: [] };
  }

  const oprs = ["oprs", "dprs", "ccwms"].map((opr) => ({ opr, label: convertOprToLabel(opr) }));

  const coprs = Object.entries(comp.teamsInsights.coprs).map(([opr]) => ({
    opr,
    label: convertOprToLabel(opr),
  }));

  return { oprs, coprs };
}
