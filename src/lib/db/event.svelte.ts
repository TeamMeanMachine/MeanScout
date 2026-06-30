import type { EventDB } from "$lib/schema";
import { SvelteMap } from "svelte/reactivity";
import { objectStoreMap } from "./object-store-map.svelte";

let db: IDBDatabase | undefined = undefined;

/** All data from the currently opened event DB. Should be affected only by the `eventDB` object. */
let maps = {
  teams: new SvelteMap<string, Readonly<EventDB.Team>>(),
  matches: new SvelteMap<string, Readonly<EventDB.Match>>(),
  picklists: new SvelteMap<string, Readonly<EventDB.Picklist>>(),
  expressions: new SvelteMap<string, Readonly<EventDB.Expression>>(),
  forms: new SvelteMap<string, Readonly<EventDB.Form>>(),
  entries: new SvelteMap<string, Readonly<EventDB.Entry>>(),
  guesses: new SvelteMap<string, Readonly<EventDB.Guess>>(),
};

export const eventDB = {
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
        const getTx = openRequest.result.transaction(Object.keys(maps));
        getTx.onabort = () => {
          reject(stringifyIDBError(getTx.error, "Could not get data afer opening"));
        };

        const getTeams = getTx.objectStore("teams").getAll();
        const getMatches = getTx.objectStore("matches").getAll();
        const getPicklists = getTx.objectStore("picklists").getAll();
        const getExpressions = getTx.objectStore("expressions").getAll();
        const getForms = getTx.objectStore("forms").getAll();
        const getEntries = getTx.objectStore("entries").getAll();
        const getGuesses = getTx.objectStore("guesses").getAll();

        getTx.oncomplete = () => {
          if (db) db.close();
          db = openRequest.result;

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
  picklists: objectStoreMap("piclists", () => maps.picklists, getDB),
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
