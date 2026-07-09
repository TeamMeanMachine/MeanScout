import { SvelteMap } from "svelte/reactivity";
import z from "zod";
import { objectStoreMap } from "./object-store-map.svelte";

const schemas = {
  event: z.object({
    id: z.string(),
    name: z.string(),
    tbaEventKey: z.string().optional(),
    madeAt: z.number(),
  }),

  team: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.base64().optional(),
  }),
};

export namespace MetaDB {
  export type Event = z.infer<typeof schemas.event>;
  export type Team = z.infer<typeof schemas.team>;
}

let db: IDBDatabase | undefined = undefined;

/** All data from the meta DB. Should be affected only by the `MetaDB` object. */
let maps = {
  events: new SvelteMap<string, Readonly<MetaDB.Event>>(),
  teams: new SvelteMap<string, Readonly<MetaDB.Team>>(),
};

export const MetaDB = {
  schemas,

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
        reject("Meta DB: Not ready");
        return;
      }

      const getTx = db.transaction(Object.keys(maps));
      getTx.onabort = () => {
        reject(stringifyIDBError(getTx.error, "Could not refresh data"));
      };

      const getEvents = getTx.objectStore("events").getAll();
      const getTeams = getTx.objectStore("teams").getAll();

      getTx.oncomplete = () => {
        maps = {
          events: new SvelteMap(getEvents.result.map((event) => [event.id, event])),
          teams: new SvelteMap(getTeams.result.map((team) => [team.id, team])),
        };
        resolve();
      };
    });
  },

  events: objectStoreMap("events", () => maps.events, getDB),
  teams: objectStoreMap("teams", () => maps.teams, getDB),
};

function getDB() {
  return db;
}

function stringifyIDBError(error: DOMException | null, fallbackMessage: string) {
  return `Meta DB: ${fallbackMessage} - ${error?.name || "Error"}: ${error?.message}`;
}
