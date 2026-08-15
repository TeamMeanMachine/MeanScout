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
    metaDB: z.object({
      version: z.number(),
      teams: MetaDB.schemas.team.array().optional(),
      events: MetaDB.schemas.event.array().optional(),
    }),
    eventDBs: z.record(
      z.string(),
      z.object({
        version: z.number(),
        teams: EventDB.schemas.team.array().optional(),
        matches: EventDB.schemas.match.array().optional(),
        scenarios: EventDB.schemas.scenario.array().optional(),
        picklists: EventDB.schemas.picklist.array().optional(),
        expressions: EventDB.schemas.expression.array().optional(),
        forms: EventDB.schemas.form.array().optional(),
        entries: EventDB.schemas.entry.array().optional(),
        guesses: EventDB.schemas.guess.array().optional(),
      }),
    ),
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

function mergeDataSets<T extends { id: string }>(
  incoming: T[],
  existing: T[] | undefined,
  mergeFunc: (i: T, e: T) => T,
) {
  const merged: T[] = [];

  if (incoming.length) {
    for (const incomingData of incoming) {
      const existingData = existing?.find((d) => d.id == incomingData.id);
      if (!existingData) {
        merged.push($state.snapshot(incomingData) as T);
        continue;
      }

      merged.push($state.snapshot(mergeFunc(incomingData, existingData)) as T);
    }
  }

  return merged;
}

export function mergeOldAndNewData({
  imported,
  existing,
  overwriteDuplicateEntries,
  includeExisting,
}: ImportDataParams & { includeExisting: boolean }) {
  const merged: ImportedData = {};

  if (imported.metaDB) {
    if (!merged.metaDB) merged.metaDB = { version: 0 };

    if (imported.metaDB.teams?.length) {
      merged.metaDB.teams = mergeDataSets(imported.metaDB.teams, existing.metaDB?.teams, (i, e) => ({
        ...e,
        name: i.name || e.name,
        avatar: i.avatar || e.avatar,
      }));
    }

    if (imported.metaDB.events?.length) {
      merged.metaDB.events = mergeDataSets(imported.metaDB.events, existing.metaDB?.events, (i, e) => ({
        ...e,
        name: i.name || e.name,
        key: i.key || e.key,
        remapTeams: i.remapTeams || e.remapTeams ? { ...e.remapTeams, ...i.remapTeams } : undefined,
        alliances: i.alliances || e.alliances,
        edited: i.edited || e.edited,
      }));
    }
  }

  if (imported.eventDBs) {
    if (!merged.eventDBs) merged.eventDBs = {};

    for (const eventId in imported.eventDBs) {
      if (!merged.eventDBs[eventId]) merged.eventDBs[eventId] = { version: 0 };
      const incomingDB = imported.eventDBs[eventId];
      const existingDB = existing.eventDBs?.[eventId];
      const mergedDB = merged.eventDBs[eventId];

      if (incomingDB.teams?.length) {
        mergedDB.teams = mergeDataSets(incomingDB.teams, existingDB?.teams, (i, e) => ({
          ...e,
          rank: i.rank || e.rank,
          stats: i.stats || e.stats ? { ...e.stats, ...i.stats } : undefined,
          oprs: i.oprs || e.oprs ? { ...e.oprs, ...i.oprs } : undefined,
          epa: i.epa || e.epa ? { ...e.epa, ...i.epa } : undefined,
          images:
            i.images?.length || e.images?.length ? [...new Set([...(e.images || []), ...(i.images || [])])] : undefined,
        }));
      }

      if (incomingDB.matches?.length) {
        mergedDB.matches = mergeDataSets(incomingDB.matches, existingDB?.matches, (i, e) => ({
          ...e,
          red: {
            ...e.red,
            score: i.red.score || e.red.score || undefined,
            breakdown: i.red.breakdown || e.red.breakdown,
          },
          blue: {
            ...e.blue,
            score: i.blue.score || e.blue.score || undefined,
            breakdown: i.blue.breakdown || e.blue.breakdown,
          },
          prediction: i.prediction || e.prediction,
          started: i.started || e.started || undefined,
          winner: i.winner || e.winner,
          videos:
            i.videos?.length || e.videos?.length ? [...new Set([...(e.videos || []), ...(i.videos || [])])] : undefined,
        }));
      }

      if (incomingDB.scenarios?.length) {
        mergedDB.scenarios = mergeDataSets(incomingDB.scenarios, existingDB?.scenarios, (i, e) => ({
          ...e,
          name: i.name || e.name,
          type: i.type || e.type,
          alliances: i.alliances || e.alliances,
          matches: i.matches || e.matches,
          edited: i.edited || e.edited,
        }));
      }

      if (incomingDB.picklists?.length) {
        mergedDB.picklists = mergeDataSets(incomingDB.picklists, existingDB?.picklists, (i, e) => {
          const notes = $state.snapshot(e.notes);
          for (const team in i.notes) {
            notes[team] = i.notes[team] || e.notes[team];
          }
          const omits = $state.snapshot(e.omits);
          for (const team in i.omits) {
            omits[team] = i.omits[team] || e.omits[team];
          }
          return {
            ...e,
            name: i.name || e.name,
            weights: i.weights.length ? i.weights : e.weights,
            notes,
            omits,
            customSort: i.customSort || e.customSort,
            edited: i.edited || e.edited,
          };
        });
      }

      if (incomingDB.expressions?.length) {
        mergedDB.expressions = mergeDataSets(incomingDB.expressions, existingDB?.expressions, (i, e) => ({
          ...e,
          name: i.name || e.name,
          inputs: i.inputs.length ? i.inputs : e.inputs,
          method: i.method || e.method,
          aggregate: i.aggregate || e.aggregate,
          edited: i.edited || e.edited,
        }));
      }

      if (incomingDB.forms?.length) {
        mergedDB.forms = mergeDataSets(incomingDB.forms, existingDB?.forms, (i, e) => ({
          ...e,
          name: i.name || e.name,
          type: i.type || e.type,
          controls: i.controls.length ? i.controls : e.controls,
          edited: i.edited || e.edited,
        }));
      }

      if (incomingDB.entries?.length) {
        mergedDB.entries = mergeDataSets(incomingDB.entries, existingDB?.entries, (i, e) => ({
          ...e,
          status: i.status || e.status,
          team: i.team || e.team,
          matchId: i.matchId ?? e.matchId,
          absent: i.absent ?? e.absent,
          values: { ...e.values, ...i.values },
          edited: i.edited || e.edited,
        }));
      }

      if (incomingDB.guesses?.length) {
        mergedDB.guesses = mergeDataSets(incomingDB.guesses, existingDB?.guesses, (_, e) => e);
      }
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
