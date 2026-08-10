import type { SvelteMap } from "svelte/reactivity";

/**
 * Maps a reactive SvelteMap to an IDB object store.
 * @param storeName Name of object store to be mapped to.
 * @param getMap Returns a SvelteMap.
 * @param getDB Returns a database connection (or undefined).
 */
export function objectStoreMap<T extends { id: string }>(
  storeName: string,
  getMap: () => SvelteMap<string, Readonly<T>>,
  getDB: () => IDBDatabase | undefined,
) {
  function stringifyIDBError(dbName: string | undefined, error: DOMException | null, fallbackMessage: string) {
    return `${dbName ? `${dbName} DB` : "DB"}: ${fallbackMessage} - ${error?.name || "Error"}: ${error?.message}`;
  }

  return {
    get storeName() {
      return storeName;
    },

    /** Reference to the underlying SvelteMap, with mutable props omitted from the type. */
    get read(): Omit<ReturnType<typeof getMap>, "set" | "delete" | "clear" | "getOrInsert" | "getOrInsertComputed"> {
      return getMap();
    },

    get size() {
      return getMap().size;
    },

    get(id: string): Readonly<T> | undefined {
      return getMap().get(id);
    },

    map<U>(callbackfn: (value: Readonly<T>, index: number) => Readonly<U>) {
      return getMap().values().toArray().map(callbackfn);
    },

    toSorted(compareFn: (a: Readonly<T>, b: Readonly<T>) => number): Readonly<T>[] {
      return getMap().values().toArray().toSorted(compareFn);
    },

    /** Puts one or many records to the IDB object store. If successful, updates the underlying SvelteMap. */
    set(recordOrMany: T | T[], ...more: (typeof recordOrMany)[]) {
      return new Promise<void>((resolve, reject) => {
        const db = getDB();

        if (!db) {
          reject("DB: Not ready");
          return;
        }

        const tx = db.transaction(storeName, "readwrite");

        const records = $state.snapshot([
          ...(Array.isArray(recordOrMany) ? recordOrMany : [recordOrMany]),
          ...more.flatMap((v) => v),
        ]);

        for (const record of records) {
          tx.objectStore(storeName).put(record);
        }

        tx.oncomplete = () => {
          const map = getMap();
          for (const record of records) {
            map.set(record.id, record as any);
          }
          resolve();
        };

        tx.onerror = () => {
          reject(stringifyIDBError(db.name, tx.error, `Could not set ${records.length} ${storeName}`));
        };
      });
    },

    /** Puts one or many records to the IDB object store. If successful, updates the underlying SvelteMap. */
    setMap(mapOrMany: Map<any, T> | Map<any, T>[], ...more: (typeof mapOrMany)[]) {
      return new Promise<void>((resolve, reject) => {
        const db = getDB();

        if (!db) {
          reject("DB: Not ready");
          return;
        }

        const tx = db.transaction(storeName, "readwrite");

        const records = $state.snapshot([
          ...(Array.isArray(mapOrMany) ? mapOrMany.flatMap((v) => v.values().toArray()) : mapOrMany.values().toArray()),
          ...more.flatMap((mapOrMany) =>
            Array.isArray(mapOrMany) ? mapOrMany.flatMap((v) => v.values().toArray()) : mapOrMany.values().toArray(),
          ),
        ]);

        for (const record of records) {
          tx.objectStore(storeName).put(record);
        }

        tx.oncomplete = () => {
          const map = getMap();
          for (const record of records) {
            map.set(record.id, record as any);
          }
          resolve();
        };

        tx.onerror = () => {
          reject(stringifyIDBError(db.name, tx.error, `Could not set ${records.length} ${storeName}`));
        };
      });
    },

    /** Deletes one or many records within the IDB object store. If successful, updates the underlying SvelteMap. */
    delete(keyOrRecordOrMany: string | T | (string | T)[], ...more: (typeof keyOrRecordOrMany)[]) {
      return new Promise<void>((resolve, reject) => {
        const db = getDB();

        if (!db) {
          reject("DB: Not ready");
          return;
        }

        const tx = db.transaction(storeName, "readwrite");

        const keysOrRecords = [
          ...(Array.isArray(keyOrRecordOrMany) ? keyOrRecordOrMany : [keyOrRecordOrMany]),
          ...more.flatMap((v) => v),
        ];
        const keys = keysOrRecords.map((v) => (typeof v == "string" ? v : v.id));

        for (const key of keys) {
          tx.objectStore(storeName).delete(key);
        }

        tx.oncomplete = () => {
          const map = getMap();
          for (const key of keys) {
            map.delete(key);
          }
          resolve();
        };

        tx.onerror = () => {
          reject(stringifyIDBError(db.name, tx.error, `Could not delete ${keys.length} ${storeName}`));
        };
      });
    },

    /** Deletes all data within the IDB object store. If successful, also clears the underlying SvelteMap. */
    clear() {
      return new Promise<void>((resolve, reject) => {
        const db = getDB();

        if (!db) {
          reject("DB: Not ready");
          return;
        }

        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).clear();

        tx.oncomplete = () => {
          getMap().clear();
          resolve();
        };

        tx.onerror = () => {
          reject(stringifyIDBError(db.name, tx.error, `Could not clear ${storeName}`));
        };
      });
    },
  };
}
