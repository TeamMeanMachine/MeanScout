import type { TeamInsights } from "$lib";
import type { MatchLevel } from "$lib/match";
import { SvelteMap } from "svelte/reactivity";

let db: IDBDatabase | undefined = undefined;

const maps = {
  teams: new SvelteMap<string, Readonly<Team>>(),
  matches: new SvelteMap<string, Readonly<Match>>(),
  guesses: new SvelteMap<string, Readonly<Guess>>(),
  surveys: new SvelteMap<string, Readonly<Survey>>(),
  entries: new SvelteMap<string, Readonly<Entry>>(),
} as const;

export const compDB = {
  /**
   * Attempts to open (or create) the specified comp database.
   * Will close existing DB connection if the new one is different.
   * Promise resolves after successfully opening DB and getting all data.
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

      if (db) {
        db.close();
        db = undefined;

        maps.teams.clear();
        maps.matches.clear();
        maps.guesses.clear();
        maps.surveys.clear();
        maps.entries.clear();
      }

      const openRequest = indexedDB.open(id);
      openRequest.onerror = () => {
        reject(errorMessage(openRequest.error, "Could not open"));
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
        db = openRequest.result;

        const getTx = db.transaction(["teams", "matches", "guesses", "surveys", "entries"]);
        getTx.onabort = () => {
          reject(errorMessage(getTx.error, "Could not get data afer opening"));
        };

        const getTeams = getTx.objectStore("teams").getAll();
        const getMatches = getTx.objectStore("matches").getAll();
        const getGuesses = getTx.objectStore("guesses").getAll();
        const getSurveys = getTx.objectStore("surveys").getAll();
        const getEntries = getTx.objectStore("entries").getAll();

        getTx.oncomplete = () => {
          for (const team of getTeams.result) {
            maps.teams.set(team.id, team);
          }

          for (const match of getMatches.result) {
            maps.matches.set(match.id, match);
          }

          for (const guess of getGuesses.result) {
            maps.guesses.set(guess.id, guess);
          }

          for (const survey of getSurveys.result) {
            maps.surveys.set(survey.id, survey);
          }

          for (const entry of getEntries.result) {
            maps.entries.set(entry.id, entry);
          }

          resolve();
        };
      };
    });
  },

  refresh() {
    return new Promise<void>((resolve, reject) => {
      if (!db) {
        reject("Comp DB: Not ready");
        return;
      }

      const getTx = transaction(["teams", "matches", "guesses", "surveys", "entries"]);
      getTx.onabort = () => {
        reject(errorMessage(getTx.error, "Could not refresh data"));
      };

      const getTeams = getTx.objectStore("teams").getAll();
      const getMatches = getTx.objectStore("matches").getAll();
      const getGuesses = getTx.objectStore("guesses").getAll();
      const getSurveys = getTx.objectStore("surveys").getAll();
      const getEntries = getTx.objectStore("entries").getAll();

      getTx.oncomplete = () => {
        maps.teams.clear();
        maps.matches.clear();
        maps.guesses.clear();
        maps.surveys.clear();
        maps.entries.clear();

        for (const team of getTeams.result) {
          maps.teams.set(team.id, team);
        }

        for (const match of getMatches.result) {
          maps.matches.set(match.id, match);
        }

        for (const guess of getGuesses.result) {
          maps.guesses.set(guess.id, guess);
        }

        for (const survey of getSurveys.result) {
          maps.surveys.set(survey.id, survey);
        }

        for (const entry of getEntries.result) {
          maps.entries.set(entry.id, entry);
        }

        resolve();
      };
    });
  },

  teams: storeMap(maps.teams, "teams"),
  matches: storeMap(maps.matches, "matches"),
  guesses: storeMap(maps.guesses, "guesses"),
  surveys: storeMap(maps.surveys, "surveys"),
  entries: storeMap(maps.entries, "entries"),
};

function transaction(storeNames: StoreName | StoreName[], mode?: IDBTransactionMode) {
  if (!db) throw new Error("Comp DB: Not ready");
  return db.transaction(storeNames, mode);
}

function errorMessage(error: DOMException | null, fallbackMessage: string) {
  return `${db?.name || "Comp"} DB: ${fallbackMessage} - ${error?.name || "Error"}: ${error?.message}`;
}

function storeMap<Record extends { id: string }>(
  map: SvelteMap<string, Readonly<Record>>,
  storeName: keyof typeof maps,
) {
  const write = {
    set(recordOrMany: Record | Record[]) {
      return new Promise<void>((resolve, reject) => {
        const tx = transaction(storeName, "readwrite");

        const records = $state.snapshot(Array.isArray(recordOrMany) ? recordOrMany : [recordOrMany]);

        for (const record of records) {
          tx.objectStore(storeName).put(record);
        }

        tx.oncomplete = () => {
          for (const record of records) {
            map.set(record.id, record as Readonly<Record>);
          }
          resolve();
        };

        tx.onerror = () => {
          reject(errorMessage(tx.error, `Could not set ${records.length} ${storeName}`));
        };
      });
    },

    delete(keyOrRecordOrMany: string | Record | (string | Record)[]) {
      return new Promise<void>((resolve, reject) => {
        const tx = transaction(storeName, "readwrite");

        const keysOrRecords = Array.isArray(keyOrRecordOrMany) ? keyOrRecordOrMany : [keyOrRecordOrMany];
        const keys = keysOrRecords.map((v) => (typeof v == "string" ? v : v.id));

        for (const key of keys) {
          tx.objectStore(storeName).delete(key);
        }

        tx.oncomplete = () => {
          for (const key of keys) {
            map.delete(key);
          }
          resolve();
        };

        tx.onerror = () => {
          reject(errorMessage(tx.error, `Could not delete ${keys.length} ${storeName}`));
        };
      });
    },

    clear() {
      return new Promise<void>((resolve, reject) => {
        const tx = transaction(storeName, "readwrite");
        tx.objectStore(storeName).clear();

        tx.oncomplete = () => {
          map.clear();
          resolve();
        };

        tx.onerror = () => {
          reject(errorMessage(tx.error, `Could not clear ${storeName}`));
        };
      });
    },
  };

  return {
    /** Underlying SvelteMap with mutable prop type-stripped. */
    read: map as Omit<SvelteMap<string, Record>, keyof typeof write | "getOrInsert" | "getOrInsertComputed">,
    /** Mutable methods that affect both IndexedDB and the SvelteMap. */
    write,
    /** Refreshes underlying SvelteMap with data from IndexedDB. */
    refresh() {
      return new Promise<void>((resolve, reject) => {
        const getTx = transaction(storeName);
        getTx.onabort = () => {
          reject(errorMessage(getTx.error, `Could not refresh ${storeName}`));
        };

        const getRequest = getTx.objectStore(storeName).getAll();

        getTx.oncomplete = () => {
          map.clear();

          for (const record of getRequest.result) {
            map.set(record.id, record);
          }

          resolve();
        };
      });
    },
  };
}

// Store types

type StoreName = "teams" | "matches" | "guesses" | "surveys" | "entries";

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
