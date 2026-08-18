import { Control, Input, Method, Schema } from "$lib/schema";
import { SvelteMap } from "svelte/reactivity";
import z from "zod";
import { objectStoreMap } from "./object-store-map.svelte";

const version = 1;

const schemas = {
  team: z.object({
    // Team number only.
    id: z.string(),
    rank: z.number().optional(),
    stats: z.record(z.string(), z.number()).optional(),
    oprs: z.record(z.string(), z.number()).optional(),
    epa: z.record(z.string(), z.any()).optional(),
    images: z.string().array().optional(),
  }),

  match: z.object({
    // TBA format: [COMP_LEVEL]m[MATCH_NUMBER]
    id: z.string(),
    red: z.object({
      teams: z.string().array(),
      score: z.number().optional(),
      breakdown: z.record(z.string(), z.any()).optional(),
    }),
    blue: z.object({
      teams: z.string().array(),
      score: z.number().optional(),
      breakdown: z.record(z.string(), z.any()).optional(),
    }),
    prediction: z.record(z.string(), z.any()).optional(),
    started: z.number().optional(),
    winner: z.literal(["red", "blue"]).optional(),
    videos: z.string().array().optional(),
  }),

  scenario: z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal(["playoffs"]),
    alliances: z.object({ teams: z.string().array() }).array().optional(),
    matches: z
      .object({
        red: z.number(),
        blue: z.number(),
        winner: z.literal(["red", "blue"]).optional(),
      })
      .array()
      .optional(),
    made: Schema.timestamp,
    edited: Schema.timestamp.optional(),
  }),

  picklist: z.object({
    id: z.string(),
    name: z.string(),
    weights: Input.weight.array(),
    notes: z.record(z.string(), z.string()),
    omits: z.record(z.string(), z.boolean()),
    customSort: z.record(z.string(), z.string()).optional(),
    made: Schema.timestamp,
    edited: Schema.timestamp.optional(),
  }),

  expression: z.object({
    id: z.string(),
    name: z.string(),
    inputs: Input.any.array(),
    method: Method.any,
    aggregate: Method.reducer.optional(),
    made: Schema.timestamp,
    edited: Schema.timestamp.optional(),
  }),

  form: z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal(["match", "pit"]),
    controls: Control.any.array(),
    made: Schema.timestamp,
    edited: Schema.timestamp.optional(),
  }),

  entry: z.object({
    id: z.string(),
    // May not need form id depending on how I implement this.
    formId: z.string(),
    status: z.literal(["draft", "review", "done", "deleted"]),
    team: z.string(),
    matchId: z.string().optional(),
    absent: z.boolean().optional(),
    values: z.record(z.string(), z.any()),
    made: Schema.timestamp,
    edited: Schema.timestamp.optional(),
  }),

  guess: z.object({
    id: z.string(),
    matchId: z.string(),
    choice: z.literal(["red", "blue"]),
    reason: z.string().optional(),
    made: Schema.timestamp,
  }),
};

const bulkSchema = z.object({
  version: z.number(),
  teams: schemas.team.array().optional(),
  matches: schemas.match.array().optional(),
  scenarios: schemas.scenario.array().optional(),
  picklists: schemas.picklist.array().optional(),
  expressions: schemas.expression.array().optional(),
  forms: schemas.form.array().optional(),
  entries: schemas.entry.array().optional(),
  guesses: schemas.guess.array().optional(),
});

export namespace EventDB {
  export type Team = z.infer<typeof schemas.team>;
  export type Match = z.infer<typeof schemas.match>;
  export type Scenario = z.infer<typeof schemas.scenario>;
  export type Picklist = z.infer<typeof schemas.picklist>;
  export type Expression = z.infer<typeof schemas.expression>;
  export type Form = z.infer<typeof schemas.form>;
  export type Entry = z.infer<typeof schemas.entry>;
  export type Guess = z.infer<typeof schemas.guess>;

  export type Bulk = z.infer<typeof bulkSchema>;
}

const merge = {
  team: (incoming: EventDB.Team, existing: EventDB.Team): EventDB.Team => ({
    ...existing,
    rank: incoming.rank || existing.rank,
    stats: incoming.stats || existing.stats ? { ...existing.stats, ...incoming.stats } : undefined,
    oprs: incoming.oprs || existing.oprs ? { ...existing.oprs, ...incoming.oprs } : undefined,
    epa: incoming.epa || existing.epa ? { ...existing.epa, ...incoming.epa } : undefined,
    images:
      incoming.images?.length || existing.images?.length
        ? [...new Set([...(existing.images || []), ...(incoming.images || [])])]
        : undefined,
  }),

  match: (incoming: EventDB.Match, existing: EventDB.Match): EventDB.Match => ({
    ...existing,
    red: {
      ...existing.red,
      score: incoming.red.score || existing.red.score || undefined,
      breakdown: incoming.red.breakdown || existing.red.breakdown,
    },
    blue: {
      ...existing.blue,
      score: incoming.blue.score || existing.blue.score || undefined,
      breakdown: incoming.blue.breakdown || existing.blue.breakdown,
    },
    prediction: incoming.prediction || existing.prediction,
    started: incoming.started || existing.started || undefined,
    winner: incoming.winner || existing.winner,
    videos:
      incoming.videos?.length || existing.videos?.length
        ? [...new Set([...(existing.videos || []), ...(incoming.videos || [])])]
        : undefined,
  }),

  scenario: (incoming: EventDB.Scenario, existing: EventDB.Scenario): EventDB.Scenario => ({
    ...existing,
    name: incoming.name || existing.name,
    type: incoming.type || existing.type,
    alliances: incoming.alliances || existing.alliances,
    matches: incoming.matches || existing.matches,
    edited: incoming.edited || existing.edited,
  }),

  picklist: (incoming: EventDB.Picklist, existing: EventDB.Picklist): EventDB.Picklist => {
    const notes = structuredClone(existing.notes);
    for (const team in incoming.notes) {
      notes[team] = incoming.notes[team] || existing.notes[team];
    }
    const omits = structuredClone(existing.omits);
    for (const team in incoming.omits) {
      omits[team] = incoming.omits[team] || existing.omits[team];
    }
    return {
      ...existing,
      name: incoming.name || existing.name,
      weights: incoming.weights.length ? incoming.weights : existing.weights,
      notes,
      omits,
      customSort: incoming.customSort || existing.customSort,
      edited: incoming.edited || existing.edited,
    };
  },

  expression: (incoming: EventDB.Expression, existing: EventDB.Expression): EventDB.Expression => ({
    ...existing,
    name: incoming.name || existing.name,
    inputs: incoming.inputs.length ? incoming.inputs : existing.inputs,
    method: incoming.method || existing.method,
    aggregate: incoming.aggregate || existing.aggregate,
    edited: incoming.edited || existing.edited,
  }),

  form: (incoming: EventDB.Form, existing: EventDB.Form): EventDB.Form => ({
    ...existing,
    name: incoming.name || existing.name,
    type: incoming.type || existing.type,
    controls: incoming.controls.length ? incoming.controls : existing.controls,
    edited: incoming.edited || existing.edited,
  }),

  entry: (incoming: EventDB.Entry, existing: EventDB.Entry): EventDB.Entry => ({
    ...existing,
    status: incoming.status || existing.status,
    team: incoming.team || existing.team,
    matchId: incoming.matchId ?? existing.matchId,
    absent: incoming.absent ?? existing.absent,
    values: { ...existing.values, ...incoming.values },
    edited: incoming.edited || existing.edited,
  }),

  guess: (_: EventDB.Guess, existing: EventDB.Guess) => existing,
};

let db: IDBDatabase | undefined = undefined;

/** All data from the currently opened event DB. Should be affected only by the `EventDB` object. */
let maps = {
  teams: new SvelteMap<string, Readonly<EventDB.Team>>(),
  matches: new SvelteMap<string, Readonly<EventDB.Match>>(),
  scenarios: new SvelteMap<string, Readonly<EventDB.Scenario>>(),
  picklists: new SvelteMap<string, Readonly<EventDB.Picklist>>(),
  expressions: new SvelteMap<string, Readonly<EventDB.Expression>>(),
  forms: new SvelteMap<string, Readonly<EventDB.Form>>(),
  entries: new SvelteMap<string, Readonly<EventDB.Entry>>(),
  guesses: new SvelteMap<string, Readonly<EventDB.Guess>>(),
};

export const EventDB = {
  version,
  schemas,
  bulkSchema,
  merge,

  /**
   * Attempts to open (or create) the event database with the specified id.
   * Will close existing DB connection if the new one is different.
   * Promise resolves after successfully opening DB and getting all data.
   * Will do nothing but resolve if the DB is already opened.
   */
  open(id: string) {
    return new Promise<void>((resolve, reject) => {
      id = id.trim();

      if (db && db.name === id) {
        this.refresh().then(resolve).catch(reject);
        return;
      }

      if (id.startsWith("_")) {
        reject("Event DB: id must not start with an underscore");
        return;
      }

      if (id.toLowerCase() === "meanscout") {
        reject("Event DB: id must not be similar to 'MeanScout'");
        return;
      }

      if (!id) {
        reject("Event DB: empty id");
        return;
      }

      const openRequest = indexedDB.open(id, version);
      openRequest.onerror = () => {
        reject(stringifyIDBError(openRequest.error, "Could not open"));
      };

      openRequest.onupgradeneeded = () => {
        const storeNames = openRequest.result.objectStoreNames;

        for (const mapName in maps) {
          if (!storeNames.contains(mapName)) {
            openRequest.result.createObjectStore(mapName, { keyPath: "id" });
          }
        }
      };

      openRequest.onsuccess = () => {
        db?.close();
        db = openRequest.result;
        this.refresh().catch(console.error).finally(resolve);
      };
    });
  },

  /** Should be called whenever the DB is externally affected (e.g. from another browser tab). */
  refresh() {
    return new Promise<void>((resolve, reject) => {
      if (!db) {
        reject("Event DB: Not ready");
        return;
      }

      const getTx = db.transaction(Object.keys(maps));
      getTx.onabort = () => {
        reject(stringifyIDBError(getTx.error, "Could not refresh data"));
      };

      const getTeams = getTx.objectStore("teams").getAll();
      const getMatches = getTx.objectStore("matches").getAll();
      const getScenarios = getTx.objectStore("scenarios").getAll();
      const getPicklists = getTx.objectStore("picklists").getAll();
      const getExpressions = getTx.objectStore("expressions").getAll();
      const getForms = getTx.objectStore("forms").getAll();
      const getEntries = getTx.objectStore("entries").getAll();
      const getGuesses = getTx.objectStore("guesses").getAll();

      getTx.oncomplete = () => {
        maps = {
          teams: new SvelteMap(getTeams.result.map((team) => [team.id, team])),
          matches: new SvelteMap(getMatches.result.map((match) => [match.id, match])),
          scenarios: new SvelteMap(getScenarios.result.map((scenario) => [scenario.id, scenario])),
          picklists: new SvelteMap(getPicklists.result.map((picklist) => [picklist.id, picklist])),
          expressions: new SvelteMap(getExpressions.result.map((expression) => [expression.id, expression])),
          forms: new SvelteMap(getForms.result.map((form) => [form.id, form])),
          entries: new SvelteMap(getEntries.result.map((entry) => [entry.id, entry])),
          guesses: new SvelteMap(getGuesses.result.map((guess) => [guess.id, guess])),
        };
        resolve();
      };
    });
  },

  teams: objectStoreMap("teams", () => maps.teams, getDB),
  matches: objectStoreMap("matches", () => maps.matches, getDB),
  scenarios: objectStoreMap("scenarios", () => maps.scenarios, getDB),
  picklists: objectStoreMap("picklists", () => maps.picklists, getDB),
  expressions: objectStoreMap("expressions", () => maps.expressions, getDB),
  forms: objectStoreMap("forms", () => maps.forms, getDB),
  entries: objectStoreMap("entries", () => maps.entries, getDB),
  guesses: objectStoreMap("guesses", () => maps.guesses, getDB),

  /** Deletes the DB with the given id. */
  delete(id: string) {
    return new Promise<void>((resolve, reject) => {
      if (id.startsWith("_")) {
        reject("Event DB: id must not start with an underscore");
        return;
      }

      if (id.toLowerCase() === "meanscout") {
        reject("Event DB: id must not be similar to 'MeanScout'");
        return;
      }

      if (!id) {
        reject("Event DB: empty id");
        return;
      }

      if (db?.name === id) {
        db.close();
        db = undefined;
      }

      const deleteRequest = indexedDB.deleteDatabase(id);
      deleteRequest.onerror = () => {
        reject(stringifyIDBError(deleteRequest.error, `Could not delete Event DB with id ${id}`));
      };

      deleteRequest.onsuccess = () => {
        resolve();
      };
    });
  },
};

function getDB() {
  return db;
}

function stringifyIDBError(error: DOMException | null, fallbackMessage: string) {
  return `${db?.name || "Event"} DB: ${fallbackMessage} - ${error?.name || "Error"}: ${error?.message}`;
}
