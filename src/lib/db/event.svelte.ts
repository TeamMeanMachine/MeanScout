import { Control, Input, Method, Schema } from "$lib/schema";
import { SvelteMap } from "svelte/reactivity";
import z from "zod";
import { objectStoreMap } from "./object-store-map.svelte";

const schemas = {
  team: z.object({
    // Team number only.
    id: z.string(),
    rank: z.number().optional(),
    stat: z.record(z.string(), z.number()).optional(),
    opr: z.record(z.string(), z.number()).optional(),
    epa: z.record(z.string(), z.any()).optional(),
    images: z.string().array().optional(),
  }),

  match: z.object({
    // TBA format: [COMP_LEVEL]m[MATCH_NUMBER]
    id: z.string(),
    // Will be dynamically combining number/set so it's less confusing in UI.
    number: z.number(),
    level: z.literal(["qm", "ef", "qf", "sf", "f"]),
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
    start: z.number().optional(),
    videos: z.string().array().optional(),
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

export namespace EventDB {
  export type Team = z.infer<typeof schemas.team>;
  export type Match = z.infer<typeof schemas.match>;
  export type Picklist = z.infer<typeof schemas.picklist>;
  export type Expression = z.infer<typeof schemas.expression>;
  export type Form = z.infer<typeof schemas.form>;
  export type Entry = z.infer<typeof schemas.entry>;
  export type Guess = z.infer<typeof schemas.guess>;
}

let db: IDBDatabase | undefined = undefined;

/** All data from the currently opened event DB. Should be affected only by the `EventDB` object. */
let maps = {
  teams: new SvelteMap<string, Readonly<EventDB.Team>>(),
  matches: new SvelteMap<string, Readonly<EventDB.Match>>(),
  picklists: new SvelteMap<string, Readonly<EventDB.Picklist>>(),
  expressions: new SvelteMap<string, Readonly<EventDB.Expression>>(),
  forms: new SvelteMap<string, Readonly<EventDB.Form>>(),
  entries: new SvelteMap<string, Readonly<EventDB.Entry>>(),
  guesses: new SvelteMap<string, Readonly<EventDB.Guess>>(),
};

export const EventDB = {
  schemas,

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
        resolve();
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

      const openRequest = indexedDB.open(id);
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
        db = openRequest.result;
        this.refresh().then(resolve).catch(reject);
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
      const getPicklists = getTx.objectStore("picklists").getAll();
      const getExpressions = getTx.objectStore("expressions").getAll();
      const getForms = getTx.objectStore("forms").getAll();
      const getEntries = getTx.objectStore("entries").getAll();
      const getGuesses = getTx.objectStore("guesses").getAll();

      getTx.oncomplete = () => {
        maps = {
          teams: new SvelteMap(getTeams.result.map((team) => [team.id, team])),
          matches: new SvelteMap(getMatches.result.map((match) => [match.id, match])),
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
  picklists: objectStoreMap("picklists", () => maps.picklists, getDB),
  expressions: objectStoreMap("expressions", () => maps.expressions, getDB),
  forms: objectStoreMap("forms", () => maps.forms, getDB),
  entries: objectStoreMap("entries", () => maps.entries, getDB),
  guesses: objectStoreMap("guesses", () => maps.guesses, getDB),
};

function getDB() {
  return db;
}

function stringifyIDBError(error: DOMException | null, fallbackMessage: string) {
  return `${db?.name || "Event"} DB: ${fallbackMessage} - ${error?.name || "Error"}: ${error?.message}`;
}
