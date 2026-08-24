import { type Team, type Value } from "$lib";
import { z } from "zod";
import { compSchema, type Comp } from "./comp";
import { EventDB, MetaDB } from "./db";
import { entrySchema, type Entry } from "./entry";
import { fieldSchema } from "./field";
import { idb } from "./idb";
import { compareMatches, type Match } from "./match";
import { surveySchema, type MatchSurvey, type PitSurvey } from "./survey";

export const importSchema = z
  .object({
    // Beta
    metaDB: MetaDB.bulkSchema,
    eventDBs: z.record(z.string(), EventDB.bulkSchema.optional()),
    // Legacy
    comps: compSchema.array(),
    surveys: surveySchema.array(),
    fields: fieldSchema.array(),
    entries: entrySchema.array(),
    version: z.number(),
  })
  .partial();
export type ImportedData = z.infer<typeof importSchema>;

type ImportDataParams = {
  existing: ImportedData;
  imported: ImportedData;
  overwriteDuplicateEntries: boolean;
};

export function importData({ existing, imported, overwriteDuplicateEntries }: ImportDataParams) {
  return new Promise<{ duplicateEntryIds: Set<string> }>((resolve, reject) => {
    const { merged, fieldsToDelete, duplicateEntryIds } = mergeOldAndNewData({
      existing,
      imported,
      overwriteDuplicateEntries,
      includeExisting: false,
    });

    if (
      !merged.comps?.length &&
      !merged.surveys?.length &&
      !merged.fields?.length &&
      !merged.entries?.length &&
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
      resolve({ duplicateEntryIds });
    };

    const compStore = transaction.objectStore("comps");
    const surveyStore = transaction.objectStore("surveys");
    const fieldStore = transaction.objectStore("fields");
    const entryStore = transaction.objectStore("entries");

    for (const comp of merged?.comps || []) {
      compStore.put($state.snapshot(comp));
    }

    for (const survey of merged?.surveys || []) {
      surveyStore.put($state.snapshot(survey));
    }

    for (const field of merged?.fields || []) {
      fieldStore.put($state.snapshot(field));
    }

    for (const entry of merged?.entries || []) {
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
  const merged: ImportedData = {};

  merged.metaDB = mergeMetaDB(imported.metaDB, existing.metaDB, includeExisting);

  for (const eventId in imported.eventDBs) {
    merged.eventDBs = {
      ...merged.eventDBs,
      [eventId]: mergeEventDB(imported.eventDBs[eventId], existing.eventDBs?.[eventId], includeExisting),
    };
  }

  if (includeExisting) {
    for (const eventId in existing.eventDBs) {
      if (merged.eventDBs && eventId in merged.eventDBs) continue;
      merged.eventDBs = {
        ...merged.eventDBs,
        [eventId]: existing.eventDBs[eventId],
      };
    }
  }

  const now = Date.now();

  const duplicateEntryIds = new Set<string>();

  const fieldsToDelete = new Set<string>();

  if (imported.comps?.length) {
    const importedComps = $state.snapshot(imported.comps);

    for (const importedComp of importedComps) {
      const existingComp = existing.comps?.find((c) => c.id == importedComp.id);
      if (!existingComp) {
        if (!merged.comps) merged.comps = [];
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

      const created = Math.min(importedComp.created, existingComp.created);

      const mergedComp: Comp = {
        id: existingComp.id,
        name: importedComp.name,
        matches: matches.toSorted(compareMatches),
        teams: teams
          .values()
          .toArray()
          .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true })),
        created,
        modified: now,
      };

      const mergedTbaEventKey = importedComp.tbaEventKey || existingComp.tbaEventKey;
      if (mergedTbaEventKey) {
        mergedComp.tbaEventKey = mergedTbaEventKey;
      }

      const mergedAlliances = importedComp.alliances || existingComp.alliances;
      if (mergedAlliances) {
        mergedComp.alliances = mergedAlliances;
      }

      const mergedTeamsInsights = importedComp.teamsInsights || existingComp.teamsInsights;
      if (mergedTeamsInsights) {
        mergedComp.teamsInsights = mergedTeamsInsights;
      }

      const scouts = new Set<string>(existingComp.scouts);
      for (const scout of importedComp.scouts || []) {
        scouts.add(scout);
      }
      if (existingComp.scouts || importedComp.scouts) {
        mergedComp.scouts = scouts
          .values()
          .toArray()
          .toSorted((a, b) => a.localeCompare(b));
      }

      if (!merged.comps) merged.comps = [];
      merged.comps.push(mergedComp);
    }
  }

  if (imported.surveys?.length) {
    const importedSurveys = $state.snapshot(imported.surveys);

    const importedFields = $state.snapshot(imported.fields);

    for (const importedSurvey of importedSurveys) {
      const importedFieldsForThisSurvey = importedFields?.filter((f) => f.surveyId == importedSurvey.id);
      const existingFieldsForThisSurvey = existing.fields?.filter((f) => f.surveyId == importedSurvey.id);

      if (importedFieldsForThisSurvey?.length) {
        for (const field of importedFieldsForThisSurvey) {
          if (!merged.fields) merged.fields = [];
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

      const existingSurvey = existing.surveys?.find((s) => s.id == importedSurvey.id);
      if (!existingSurvey) {
        if (!merged.surveys) merged.surveys = [];
        merged.surveys.push(importedSurvey);
        continue;
      }

      const created = Math.min(importedSurvey.created, existingSurvey.created);

      if (importedSurvey.type == "match") {
        const mergedSurvey: MatchSurvey = {
          id: existingSurvey.id,
          compId: existingSurvey.compId,
          name: importedSurvey.name,
          type: "match",
          fieldIds: importedSurvey.fieldIds,
          pickLists: importedSurvey.pickLists,
          expressions: importedSurvey.expressions,
          created,
          modified: now,
        };

        if (importedSurvey.tbaMetrics?.length) {
          mergedSurvey.tbaMetrics = importedSurvey.tbaMetrics;
        }

        if (!merged.surveys) merged.surveys = [];
        merged.surveys.push(mergedSurvey);
      }

      if (importedSurvey.type == "pit") {
        const mergedSurvey: PitSurvey = {
          id: existingSurvey.id,
          compId: existingSurvey.compId,
          name: importedSurvey.name,
          type: "pit",
          fieldIds: importedSurvey.fieldIds,
          created,
          modified: now,
        };

        if (!merged.surveys) merged.surveys = [];
        merged.surveys.push(mergedSurvey);
      }
    }
  }

  if (imported.entries?.length) {
    const importedEntries = $state.snapshot(imported.entries).map((entry): Entry => ({ ...entry, status: "exported" }));

    for (const importedEntry of importedEntries) {
      const existingEntry = existing.entries?.find((e) => e.id == importedEntry.id);
      if (!existingEntry) {
        if (!merged.entries) merged.entries = [];
        merged.entries.push(importedEntry);
        continue;
      } else {
        duplicateEntryIds.add(existingEntry.id);
      }

      const tbaMetrics = new Map<string, Value>();

      if (existingEntry.type == "match") {
        for (const metric of existingEntry.tbaMetrics || []) {
          tbaMetrics.set(metric.name.toLowerCase(), metric.value);
        }
      }

      if (importedEntry.type == "match") {
        for (const metric of importedEntry.tbaMetrics || []) {
          const existingMetric = tbaMetrics.get(metric.name.toLowerCase());
          if (existingMetric === undefined || overwriteDuplicateEntries) {
            tbaMetrics.set(metric.name.toLowerCase(), metric.value);
          }
        }
      }

      const newEntry = overwriteDuplicateEntries ? $state.snapshot(importedEntry) : $state.snapshot(existingEntry);

      if (tbaMetrics.size && newEntry.type == "match") {
        if (!merged.entries) merged.entries = [];
        merged.entries.push({
          ...newEntry,
          tbaMetrics: tbaMetrics
            .entries()
            .toArray()
            .map(([key, value]) => ({ name: key.toLowerCase(), value })),
        });
      } else {
        if (!merged.entries) merged.entries = [];
        merged.entries.push(newEntry);
      }
    }
  }

  if (includeExisting) {
    if (existing.comps) {
      if (!merged.comps) merged.comps = [];
      merged.comps.push(...existing.comps?.filter((comp) => !merged.comps?.some((c) => c.id == comp.id)));
    }
    if (existing.surveys) {
      if (!merged.surveys) merged.surveys = [];
      merged.surveys.push(...existing.surveys?.filter((survey) => !merged.surveys?.some((s) => s.id == survey.id)));
    }
    if (existing.fields) {
      if (!merged.fields) merged.fields = [];
      merged.fields.push(...existing.fields?.filter((field) => !merged.fields?.some((f) => f.id == field.id)));
    }
    if (existing.entries) {
      if (!merged.entries) merged.entries = [];
      merged.entries.push(...existing.entries?.filter((entry) => !merged.entries?.some((e) => e.id == entry.id)));
    }
  }

  if (fieldsToDelete.size) {
    merged.fields = merged.fields?.filter((f) => !fieldsToDelete.has(f.id));
  }

  return { merged, fieldsToDelete, duplicateEntryIds };
}

function mergeMetaDB(incoming: MetaDB.Bulk | undefined, existing: MetaDB.Bulk | undefined, appendExisting: boolean) {
  if (!(incoming || existing)) return;

  if (incoming) {
    if (incoming.version < MetaDB.version) {
      // Migrate up!
    } else if (incoming.version > MetaDB.version) {
      // App outdated!
      return;
    }
  } else if (appendExisting) {
    return existing;
  }

  const merged: MetaDB.Bulk = { version: MetaDB.version };

  if (incoming?.teams?.length || existing?.teams?.length) {
    merged.teams = mergeArray(incoming?.teams, existing?.teams, MetaDB.merge.team, appendExisting);
  }

  if (incoming?.events?.length || existing?.events?.length) {
    merged.events = mergeArray(incoming?.events, existing?.events, MetaDB.merge.event, appendExisting);
  }

  return merged;
}

function mergeEventDB(incoming: EventDB.Bulk | undefined, existing: EventDB.Bulk | undefined, appendExisting: boolean) {
  if (!(incoming || existing)) return;

  if (incoming) {
    if (incoming.version < EventDB.version) {
      // Migrate up!
    } else if (incoming.version > EventDB.version) {
      // App outdated!
      return;
    }
  } else if (appendExisting) {
    return existing;
  }

  const merged: EventDB.Bulk = { version: EventDB.version };

  if (incoming?.teams?.length || existing?.teams?.length) {
    merged.teams = mergeArray(incoming?.teams, existing?.teams, EventDB.merge.team, appendExisting);
  }

  if (incoming?.matches?.length || existing?.matches?.length) {
    merged.matches = mergeArray(incoming?.matches, existing?.matches, EventDB.merge.match, appendExisting);
  }

  if (incoming?.scenarios?.length || existing?.scenarios?.length) {
    merged.scenarios = mergeArray(incoming?.scenarios, existing?.scenarios, EventDB.merge.scenario, appendExisting);
  }

  if (incoming?.picklists?.length || existing?.picklists?.length) {
    merged.picklists = mergeArray(incoming?.picklists, existing?.picklists, EventDB.merge.picklist, appendExisting);
  }

  if (incoming?.expressions?.length || existing?.expressions?.length) {
    merged.expressions = mergeArray(
      incoming?.expressions,
      existing?.expressions,
      EventDB.merge.expression,
      appendExisting,
    );
  }

  if (incoming?.forms?.length || existing?.forms?.length) {
    merged.forms = mergeArray(incoming?.forms, existing?.forms, EventDB.merge.form, appendExisting);
  }

  if (incoming?.entries?.length || existing?.entries?.length) {
    merged.entries = mergeArray(incoming?.entries, existing?.entries, EventDB.merge.entry, appendExisting);
  }

  if (incoming?.guesses?.length || existing?.guesses?.length) {
    merged.guesses = mergeArray(incoming?.guesses, existing?.guesses, EventDB.merge.guess, appendExisting);
  }

  return merged;
}

function mergeArray<T extends { id: string }>(
  incoming: T[] | undefined,
  existing: T[] | undefined,
  mergeObject: (i: T, e: T) => T,
  appendExisting: boolean,
) {
  if (!(incoming?.length || !existing?.length)) {
    return;
  }

  const mergedArray: T[] = [];

  if (incoming?.length) {
    for (const i of incoming) {
      const e = existing?.find((e) => e.id == i.id);
      mergedArray.push(e ? mergeObject(i, e) : i);
    }
  }

  if (existing?.length && appendExisting) {
    mergedArray.push(...existing.filter((e) => !mergedArray?.some((m) => e.id == m.id)));
  }

  return mergedArray;
}
