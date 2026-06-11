import { SvelteMap } from "svelte/reactivity";

let db: IDBDatabase | undefined = undefined;

const maps = {
  teams: new SvelteMap<string, Readonly<Team>>(),
  comps: new SvelteMap<string, Readonly<Comp>>(),
} as const;

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
        reject(errorMessage(openRequest.error, "Could not open"));
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
        db = openRequest.result;

        const getTx = db.transaction(["comps", "teams"]);
        getTx.onabort = () => {
          reject(errorMessage(getTx.error, "Could not get data after opening"));
        };

        const getComps = getTx.objectStore("comps").getAll();
        const getTeams = getTx.objectStore("teams").getAll();

        getTx.oncomplete = () => {
          for (const comp of getComps.result) {
            maps.comps.set(comp.id, comp);
          }

          for (const team of getTeams.result) {
            maps.teams.set(team.id, team);
          }

          resolve();
        };
      };
    });
  },

  refresh() {
    return new Promise<void>((resolve, reject) => {
      if (!db) {
        reject("Meta DB: Not ready");
        return;
      }

      const getTx = transaction(["comps", "teams"]);
      getTx.onabort = () => {
        reject(errorMessage(getTx.error, "Could not refresh data"));
      };

      const getComps = getTx.objectStore("comps").getAll();
      const getTeams = getTx.objectStore("teams").getAll();

      getTx.oncomplete = () => {
        maps.comps.clear();
        maps.teams.clear();

        for (const comp of getComps.result) {
          maps.comps.set(comp.id, comp);
        }

        for (const team of getTeams.result) {
          maps.teams.set(team.id, team);
        }

        resolve();
      };
    });
  },

  comps: storeMap(maps.comps, "comps"),
  teams: storeMap(maps.teams, "teams"),
};

function transaction(storeNames: StoreName | StoreName[], mode?: IDBTransactionMode) {
  if (!db) throw new Error("Meta DB: Not ready");
  return db.transaction(storeNames, mode);
}

function errorMessage(error: DOMException | null, fallbackMessage: string) {
  return `Meta DB: ${fallbackMessage} - ${error?.name || "Error"}: ${error?.message}`;
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

type StoreName = "comps" | "teams";

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
