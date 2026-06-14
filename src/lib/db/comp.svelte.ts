import type { TeamInsights } from "$lib";
import type { MatchLevel } from "$lib/match";
import { SvelteMap } from "svelte/reactivity";
import { objectStoreMap } from "./object-store-map.svelte";

let db: IDBDatabase | undefined = undefined;

/** All data from the currently opened comp DB. Should be affected only by the `compDB` object. */
let maps = {
  teams: new SvelteMap<string, Readonly<Team>>(),
  matches: new SvelteMap<string, Readonly<Match>>(),
  guesses: new SvelteMap<string, Readonly<Guess>>(),
  surveys: new SvelteMap<string, Readonly<Survey>>(),
  entries: new SvelteMap<string, Readonly<Entry>>(),
};

export const compDB = {
  /**
   * Attempts to open (or create) the comp database with the specified id.
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
        reject("Comp DB: id must not start with an underscore");
        return;
      }

      if (!id) {
        reject("Comp DB: empty id");
        return;
      }

      const openRequest = indexedDB.open(id);
      openRequest.onerror = () => {
        reject(stringifyIDBError(openRequest.error, "Could not open"));
      };

      openRequest.onupgradeneeded = () => {
        const storeNames = openRequest.result.objectStoreNames;

        if (!storeNames.contains("teams")) {
          openRequest.result.createObjectStore("teams", { keyPath: "id" });
        }

        if (!storeNames.contains("matches")) {
          openRequest.result.createObjectStore("matches", { keyPath: "id" });
        }

        if (!storeNames.contains("guesses")) {
          openRequest.result.createObjectStore("guesses", { keyPath: "id" });
        }

        if (!storeNames.contains("surveys")) {
          openRequest.result.createObjectStore("surveys", { keyPath: "id" });
        }

        if (!storeNames.contains("entries")) {
          openRequest.result.createObjectStore("entries", { keyPath: "id" });
        }
      };

      openRequest.onsuccess = () => {
        const getTx = openRequest.result.transaction(["teams", "matches", "guesses", "surveys", "entries"]);
        getTx.onabort = () => {
          reject(stringifyIDBError(getTx.error, "Could not get data afer opening"));
        };

        const getTeams = getTx.objectStore("teams").getAll();
        const getMatches = getTx.objectStore("matches").getAll();
        const getGuesses = getTx.objectStore("guesses").getAll();
        const getSurveys = getTx.objectStore("surveys").getAll();
        const getEntries = getTx.objectStore("entries").getAll();

        getTx.oncomplete = () => {
          if (db) db.close();
          db = openRequest.result;

          maps = {
            teams: new SvelteMap(getTeams.result.map((team) => [team.id, team])),
            matches: new SvelteMap(getMatches.result.map((match) => [match.id, match])),
            guesses: new SvelteMap(getGuesses.result.map((guess) => [guess.id, guess])),
            surveys: new SvelteMap(getSurveys.result.map((survey) => [survey.id, survey])),
            entries: new SvelteMap(getEntries.result.map((entry) => [entry.id, entry])),
          };
          resolve();
        };
      };
    });
  },

  /** Should be called whenever the DB is externally affected (e.g. across browser tabs). */
  refresh() {
    return new Promise<void>((resolve, reject) => {
      if (!db) {
        reject("Comp DB: Not ready");
        return;
      }

      const getTx = db.transaction(["teams", "matches", "guesses", "surveys", "entries"]);
      getTx.onabort = () => {
        reject(stringifyIDBError(getTx.error, "Could not refresh data"));
      };

      const getTeams = getTx.objectStore("teams").getAll();
      const getMatches = getTx.objectStore("matches").getAll();
      const getGuesses = getTx.objectStore("guesses").getAll();
      const getSurveys = getTx.objectStore("surveys").getAll();
      const getEntries = getTx.objectStore("entries").getAll();

      getTx.oncomplete = () => {
        maps = {
          teams: new SvelteMap(getTeams.result.map((team) => [team.id, team])),
          matches: new SvelteMap(getMatches.result.map((match) => [match.id, match])),
          guesses: new SvelteMap(getGuesses.result.map((guess) => [guess.id, guess])),
          surveys: new SvelteMap(getSurveys.result.map((survey) => [survey.id, survey])),
          entries: new SvelteMap(getEntries.result.map((entry) => [entry.id, entry])),
        };
        resolve();
      };
    });
  },

  teams: objectStoreMap("teams", () => maps.teams, getDB),
  matches: objectStoreMap("matches", () => maps.matches, getDB),
  guesses: objectStoreMap("guesses", () => maps.guesses, getDB),
  surveys: objectStoreMap("surveys", () => maps.surveys, getDB),
  entries: objectStoreMap("entries", () => maps.entries, getDB),
};

function getDB() {
  return db;
}

function stringifyIDBError(error: DOMException | null, fallbackMessage: string) {
  return `${db?.name || "Comp"} DB: ${fallbackMessage} - ${error?.name || "Error"}: ${error?.message}`;
}

// Store types

type Team = {
  id: string;
  insights?: TeamInsights | undefined;
};

type Match = {
  id: string;
  number: number;
  set: number;
  level: MatchLevel;
  red: {
    teams: string[];
    score?: number | undefined;
    breakdown?: Record<string, any> | undefined;
  };
  blue: {
    teams: string[];
    score?: number | undefined;
    breakdown?: Record<string, any> | undefined;
  };
  startedAt?: number | undefined;
};

type Guess = {
  id: string;
  matchId: string;
  scout: string;
  scoutTeam: string;
  choice: "red" | "blue";
  madeAt: number;
};

type Survey = {
  id: string;
  name: string;
  type: "match" | "pit";
  fields: Field[];
  modifiedAt: number;
};

type Entry = {
  id: string;
  surveyId: string;
  status: "draft" | "submitted" | "exported" | "deleted";
  team: string;
  matchId?: string;
  absent?: boolean | undefined;
  values: Record<string, any>;
  scout: string;
  scoutTeam: string;
  modifiedAt: number;
};

// Field types

type Field = SingleField | GroupField;

type SingleField = ToggleField | NumberField | SelectField | TextField | RatingField | TimerField;

type GroupField = {
  name: string;
  type: "group";
  fields: SingleField[];
};

type SingleFieldBase = {
  name: string;
  variable: string;
  tip?: string | undefined;
};

type ToggleField = SingleFieldBase & {
  type: "toggle";
};

type NumberField = SingleFieldBase & {
  type: "number";
  allowNegative?: boolean | undefined;
  multiples?: number[] | undefined;
};

type SelectField = SingleFieldBase & {
  type: "select";
  values: string[];
  radio?: boolean | undefined;
};

type TextField = SingleFieldBase & {
  type: "text";
  long?: boolean | undefined;
};

type RatingField = SingleFieldBase & {
  type: "rating";
};

type TimerField = SingleFieldBase & {
  type: "timer";
};
