import { type Team } from "$lib";
import { z } from "zod";
import { compSchema, type Comp } from "./comp";
import { entrySchema, type Entry, type TbaMetrics } from "./entry";
import { fieldSchema } from "./field";
import { idb, type AllData } from "./idb";
import { compareMatches, type Match } from "./match";
import { surveySchema, type MatchSurvey, type PitSurvey } from "./survey";

export const importSchema = z
  .object({
    comps: compSchema.array(),
    surveys: surveySchema.array(),
    fields: fieldSchema.array(),
    entries: entrySchema.array(),
    version: z.number(),
  })
  .partial();
export type ImportedData = z.infer<typeof importSchema>;

type ImportDataParams = {
  existing: AllData;
  imported: ImportedData;
  overwriteDuplicateEntries: boolean;
};

export function importData({ existing, imported, overwriteDuplicateEntries }: ImportDataParams) {
  return new Promise<void>((resolve, reject) => {
    const { merged, fieldsToDelete } = mergeOldAndNewData({
      existing,
      imported,
      overwriteDuplicateEntries,
      includeExisting: false,
    });

    if (
      !merged.comps.length &&
      !merged.surveys.length &&
      !merged.fields.length &&
      !merged.entries.length &&
      !fieldsToDelete.size
    ) {
      reject("No data to import");
      return;
    }

    const transaction = idb.transaction(["comps", "surveys", "fields", "entries"], "readwrite");
    transaction.onabort = (e) => {
      console.error(e);
      reject("Could not import data");
    };

    transaction.oncomplete = () => {
      resolve();
    };

    const compStore = transaction.objectStore("comps");
    const surveyStore = transaction.objectStore("surveys");
    const fieldStore = transaction.objectStore("fields");
    const entryStore = transaction.objectStore("entries");

    for (const comp of merged.comps) {
      compStore.put($state.snapshot(comp));
    }

    for (const survey of merged.surveys) {
      surveyStore.put($state.snapshot(survey));
    }

    for (const field of merged.fields) {
      fieldStore.put($state.snapshot(field));
    }

    for (const entry of merged.entries) {
      entryStore.put($state.snapshot(entry));
    }

    for (const fieldId of fieldsToDelete) {
      fieldStore.delete(fieldId);
    }
  });
}

export function mergeOldAndNewData({
  imported,
  existing,
  overwriteDuplicateEntries,
  includeExisting,
}: ImportDataParams & { includeExisting: boolean }) {
  const merged: AllData = {
    comps: [],
    surveys: [],
    fields: [],
    entries: [],
  };

  const fieldsToDelete = new Set<string>();

  if (imported.comps?.length) {
    const importedComps = $state
      .snapshot(imported.comps)
      .map((comp) => ({ ...comp, created: new Date(), modified: new Date() }));

    for (const importedComp of importedComps) {
      const existingComp = existing.comps.find((c) => c.id == importedComp.id);
      if (!existingComp) {
        merged.comps.push(importedComp);
        continue;
      }

      const matches: Match[] = [];

      for (const match of existingComp.matches) {
        const matchIndex = matches.findIndex((existingMatch) => compareMatches(existingMatch, match) == 0);

        if (matchIndex == -1) {
          matches.push($state.snapshot(match));
        } else {
          matches[matchIndex] = $state.snapshot(match);
        }
      }

      for (const importedMatch of importedComp.matches) {
        const existingMatch = matches.find((m) => compareMatches(importedMatch, m) == 0);

        if (existingMatch) {
          if (
            importedMatch.red1 != existingMatch.red1 ||
            importedMatch.red2 != existingMatch.red2 ||
            importedMatch.red3 != existingMatch.red3 ||
            importedMatch.blue1 != existingMatch.blue1 ||
            importedMatch.blue2 != existingMatch.blue2 ||
            importedMatch.blue3 != existingMatch.blue3 ||
            (importedMatch.redScore !== undefined && importedMatch.redScore != existingMatch.redScore) ||
            (importedMatch.blueScore !== undefined && importedMatch.blueScore != existingMatch.blueScore)
          ) {
            existingMatch.red1 = importedMatch.red1;
            existingMatch.red2 = importedMatch.red2;
            existingMatch.red3 = importedMatch.red3;
            existingMatch.blue1 = importedMatch.blue1;
            existingMatch.blue2 = importedMatch.blue2;
            existingMatch.blue3 = importedMatch.blue3;

            if (importedMatch.redScore !== undefined) {
              existingMatch.redScore = importedMatch.redScore;
            }

            if (importedMatch.blueScore !== undefined) {
              existingMatch.blueScore = importedMatch.blueScore;
            }
          }
        } else {
          matches.push($state.snapshot(importedMatch));
        }
      }

      const teams = new Map<string, Team>();

      for (const team of existingComp.teams) {
        teams.set(team.number, $state.snapshot(team));
      }

      for (const importedTeam of importedComp.teams) {
        const existingTeam = teams.get(importedTeam.number);

        if (existingTeam) {
          if (importedTeam.name && importedTeam.name != existingTeam.name) {
            existingTeam.name = importedTeam.name;
          }
        } else {
          teams.set(importedTeam.number, $state.snapshot(importedTeam));
        }
      }

      const created = importedComp.created < existingComp.created ? importedComp.created : existingComp.created;

      const mergedComp: Comp = {
        id: existingComp.id,
        name: importedComp.name,
        matches: matches.toSorted(compareMatches),
        teams: teams
          .values()
          .toArray()
          .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true })),
        created,
        modified: new Date(),
      };

      const mergedTbaEventKey = importedComp.tbaEventKey || existingComp.tbaEventKey;

      if (mergedTbaEventKey) {
        mergedComp.tbaEventKey = mergedTbaEventKey;
      }

      const scouts = new Set<string>();

      for (const scout of existingComp.scouts || []) {
        scouts.add(scout);
      }

      for (const scout of importedComp.scouts || []) {
        scouts.add(scout);
      }

      if (scouts.size) {
        mergedComp.scouts = scouts
          .values()
          .toArray()
          .toSorted((a, b) => a.localeCompare(b));
      }

      merged.comps.push(mergedComp);
    }
  }

  if (imported.surveys?.length) {
    const importedSurveys = $state
      .snapshot(imported.surveys)
      .map((survey) => ({ ...survey, created: new Date(), modified: new Date() }));

    const importedFields = $state.snapshot(imported.fields);

    for (const importedSurvey of importedSurveys) {
      const importedFieldsForThisSurvey = importedFields?.filter((f) => f.surveyId == importedSurvey.id);
      const existingFieldsForThisSurvey = existing.fields.filter((f) => f.surveyId == importedSurvey.id);

      if (importedFieldsForThisSurvey?.length) {
        for (const field of importedFieldsForThisSurvey) {
          merged.fields.push(field);
        }
      }

      if (existingFieldsForThisSurvey?.length) {
        for (const field of existingFieldsForThisSurvey) {
          if (!importedFieldsForThisSurvey?.some((f) => f.id == field.id)) {
            fieldsToDelete.add(field.id);
          }
        }
      }

      const existingSurvey = existing.surveys.find((s) => s.id == importedSurvey.id);
      if (!existingSurvey) {
        merged.surveys.push(importedSurvey);
        continue;
      }

      if (importedSurvey.type == "match") {
        const mergedSurvey: MatchSurvey = {
          id: existingSurvey.id,
          compId: existingSurvey.compId,
          name: importedSurvey.name,
          type: "match",
          fieldIds: importedSurvey.fieldIds,
          pickLists: importedSurvey.pickLists,
          expressions: importedSurvey.expressions,
          created: existingSurvey.created,
          modified: existingSurvey.modified,
        };

        if (importedSurvey.tbaMetrics?.length) {
          mergedSurvey.tbaMetrics = importedSurvey.tbaMetrics;
        }

        merged.surveys.push(mergedSurvey);
      }

      if (importedSurvey.type == "pit") {
        const mergedSurvey: PitSurvey = {
          id: existingSurvey.id,
          compId: existingSurvey.compId,
          name: importedSurvey.name,
          type: "pit",
          fieldIds: importedSurvey.fieldIds,
          created: existingSurvey.created,
          modified: existingSurvey.modified,
        };

        merged.surveys.push(mergedSurvey);
      }
    }
  }

  if (imported.entries?.length) {
    const importedEntries = $state
      .snapshot(imported.entries)
      .map((entry): Entry => ({ ...entry, status: "exported", created: new Date(), modified: new Date() }));

    for (const importedEntry of importedEntries) {
      const existingEntry = existing.entries.find((e) => e.id == importedEntry.id);
      if (!existingEntry) {
        merged.entries.push(importedEntry);
        continue;
      }

      const tbaMetrics: TbaMetrics = [];

      if (existingEntry.type == "match") {
        for (const metric of existingEntry.tbaMetrics || []) {
          tbaMetrics.push($state.snapshot(metric));
        }
      }

      if (importedEntry.type == "match") {
        for (const metric of importedEntry.tbaMetrics || []) {
          const metricIndex = tbaMetrics.findIndex((m) => m.name == metric.name);
          if (metricIndex !== -1 && overwriteDuplicateEntries) {
            tbaMetrics[metricIndex].value = $state.snapshot(metric).value;
          } else {
            tbaMetrics.push($state.snapshot(metric));
          }
        }
      }

      const newEntry = overwriteDuplicateEntries ? $state.snapshot(importedEntry) : $state.snapshot(existingEntry);

      if (tbaMetrics.length && newEntry.type == "match") {
        merged.entries.push({ ...newEntry, tbaMetrics });
      } else {
        merged.entries.push(newEntry);
      }
    }
  }

  if (includeExisting) {
    merged.comps.push(...existing.comps.filter((comp) => !merged.comps.some((c) => c.id == comp.id)));
    merged.surveys.push(...existing.surveys.filter((survey) => !merged.surveys.some((s) => s.id == survey.id)));
    merged.fields.push(...existing.fields.filter((field) => !merged.fields.some((f) => f.id == field.id)));
    merged.entries.push(...existing.entries.filter((entry) => !merged.entries.some((e) => e.id == entry.id)));
  }

  if (fieldsToDelete.size) {
    merged.fields = merged.fields.filter((f) => !fieldsToDelete.has(f.id));
  }

  return { merged, fieldsToDelete };
}
