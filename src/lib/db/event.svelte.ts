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
    id: Schema.matchId,
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
    matchId: Schema.matchId.optional(),
    absent: z.boolean().optional(),
    values: z.record(z.string(), z.any()),
    made: Schema.timestamp,
    edited: Schema.timestamp.optional(),
  }),

  guess: z.object({
    id: z.string(),
    matchId: Schema.matchId,
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
  export type Schemas = {
    [T in keyof typeof schemas]: z.infer<(typeof schemas)[T]>;
  };
  export type Bulk = z.infer<typeof bulkSchema>;

  export type Team = Schemas["team"];
  export type Match = Schemas["match"];
  export type Scenario = Schemas["scenario"];
  export type Picklist = Schemas["picklist"];
  export type Expression = Schemas["expression"];
  export type Form = Schemas["form"];
  export type Entry = Schemas["entry"];
  export type Guess = Schemas["guess"];
}

const merge: {
  [Name in keyof EventDB.Schemas]: (i: EventDB.Schemas[Name], e: EventDB.Schemas[Name]) => EventDB.Schemas[Name];
} = {
  team: (i, e): typeof i => ({
    ...e,
    rank: i.rank || e.rank,
    stats: i.stats || e.stats ? { ...e.stats, ...i.stats } : undefined,
    oprs: i.oprs || e.oprs ? { ...e.oprs, ...i.oprs } : undefined,
    epa: i.epa || e.epa ? { ...e.epa, ...i.epa } : undefined,
    images: i.images?.length || e.images?.length ? [...new Set([...(e.images || []), ...(i.images || [])])] : undefined,
  }),

  match: (i, e): typeof i => ({
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
    videos: i.videos?.length || e.videos?.length ? [...new Set([...(e.videos || []), ...(i.videos || [])])] : undefined,
  }),

  scenario: (i, e): typeof i => ({
    ...e,
    name: i.name || e.name,
    type: i.type || e.type,
    alliances: i.alliances || e.alliances,
    matches: i.matches || e.matches,
    edited: i.edited || e.edited,
  }),

  picklist: (i, e): typeof i => {
    const notes = structuredClone(e.notes);
    for (const team in i.notes) {
      notes[team] = i.notes[team] || e.notes[team];
    }
    const omits = structuredClone(e.omits);
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
  },

  expression: (i, e): typeof i => ({
    ...e,
    name: i.name || e.name,
    inputs: i.inputs.length ? i.inputs : e.inputs,
    method: i.method || e.method,
    aggregate: i.aggregate || e.aggregate,
    edited: i.edited || e.edited,
  }),

  form: (i, e): typeof i => ({
    ...e,
    name: i.name || e.name,
    type: i.type || e.type,
    controls: i.controls.length ? i.controls : e.controls,
    edited: i.edited || e.edited,
  }),

  entry: (i, e): typeof i => ({
    ...e,
    status: i.status || e.status,
    team: i.team || e.team,
    matchId: i.matchId ?? e.matchId,
    absent: i.absent ?? e.absent,
    values: { ...e.values, ...i.values },
    edited: i.edited || e.edited,
  }),

  guess: (i, e): typeof i => e,
};

let db: IDBDatabase | undefined = undefined;

/** All data from the currently opened event DB. Should be affected only by the `EventDB` object. */
let maps = {
  teams: new SvelteMap<string, Readonly<EventDB.Team>>(),
  matches: new SvelteMap<Schema.MatchId, Readonly<EventDB.Match>>(),
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
