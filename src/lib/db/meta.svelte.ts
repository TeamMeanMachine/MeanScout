import { SvelteMap } from "svelte/reactivity";
import { objectStoreMap } from "./object-store-map.svelte";

let db: IDBDatabase | undefined = undefined;

/** All data from the meta DB. Should be affected only by the `metaDB` object. */
let maps = {
  comps: new SvelteMap<string, Readonly<Comp>>(),
  teams: new SvelteMap<string, Readonly<Team>>(),
};

export const metaDB = {
  /**
   * Attempts to open (or create) the `_meta` database.
   * Promise resolves after successfully opening DB and getting all data.
   * Will do nothing but resolve if the DB is already open.
   */
  open() {
    return new Promise<void>((resolve, reject) => {
      if (db) {
        resolve();
        return;
      }

      const openRequest = indexedDB.open("_meta");
      openRequest.onerror = () => {
        reject(stringifyIDBError(openRequest.error, "Could not open"));
      };

      openRequest.onupgradeneeded = () => {
        if (!openRequest.result.objectStoreNames.contains("comps")) {
          openRequest.result.createObjectStore("comps", { keyPath: "id" });
        }

        if (!openRequest.result.objectStoreNames.contains("teams")) {
          openRequest.result.createObjectStore("teams", { keyPath: "id" });
        }
      };

      openRequest.onsuccess = () => {
        const getTx = openRequest.result.transaction(["comps", "teams"]);
        getTx.onabort = () => {
          reject(stringifyIDBError(getTx.error, "Could not get data after opening"));
        };

        const getComps = getTx.objectStore("comps").getAll();
        const getTeams = getTx.objectStore("teams").getAll();

        getTx.oncomplete = () => {
          db = openRequest.result;
          maps = {
            comps: new SvelteMap(getComps.result.map((comp) => [comp.id, comp])),
            teams: new SvelteMap(getTeams.result.map((team) => [team.id, team])),
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
        reject("Meta DB: Not ready");
        return;
      }

      const getTx = db.transaction(["comps", "teams"]);
      getTx.onabort = () => {
        reject(stringifyIDBError(getTx.error, "Could not refresh data"));
      };

      const getComps = getTx.objectStore("comps").getAll();
      const getTeams = getTx.objectStore("teams").getAll();

      getTx.oncomplete = () => {
        maps = {
          comps: new SvelteMap(getComps.result.map((comp) => [comp.id, comp])),
          teams: new SvelteMap(getTeams.result.map((team) => [team.id, team])),
        };
        resolve();
      };
    });
  },

  comps: objectStoreMap("comps", () => maps.comps, getDB),
  teams: objectStoreMap("teams", () => maps.teams, getDB),
};

function getDB() {
  return db;
}

function stringifyIDBError(error: DOMException | null, fallbackMessage: string) {
  return `Meta DB: ${fallbackMessage} - ${error?.name || "Error"}: ${error?.message}`;
}

// Store types

type Comp = {
  id: string;
  name: string;
  tbaEventKey?: string | undefined;
  modifiedAt: number;
};

type Team = {
  id: string;
  name: string;
};
