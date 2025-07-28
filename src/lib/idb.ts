import { schemaVersion } from "./";
import type { Comp } from "./comp";
import type { Entry } from "./entry";
import type { Field } from "./field";
import type { Survey } from "./survey";

type IDBStoreRecordMap = {
  comps: Comp;
  surveys: Survey;
  fields: Field;
  entries: Entry;
};

export type IDBStoreName = keyof IDBStoreRecordMap;

export type AllData = {
  comps: Comp[];
  surveys: Survey[];
  fields: Field[];
  entries: Entry[];
};

let db: IDBDatabase | undefined = undefined;

function init(callback: (error?: string) => void) {
  const request = indexedDB.open("MeanScout", schemaVersion);

  request.onerror = () => {
    callback(`${request.error?.message}`);
  };

  request.onupgradeneeded = (e) => {
    updateObjectStores(request);

    if (e.oldVersion < schemaVersion && request.transaction) {
      migrateData(request.transaction);
    }
  };

  request.onsuccess = () => {
    if (!request.result) {
      callback("Could not open IDB");
      return;
    }

    db = request.result;
    callback();
  };
}

function database() {
  if (!db) throw new Error("IDB not ready");
  return db;
}

function transaction(
  storeNames: IDBStoreName | IDBStoreName[],
  mode?: IDBTransactionMode,
  options?: IDBTransactionOptions,
) {
  return database().transaction(storeNames, mode, options);
}

function objectStore(name: IDBStoreName, mode?: IDBTransactionMode) {
  return database().transaction(name, mode).objectStore(name);
}

function add<T extends IDBStoreName>(storeName: T, record: IDBStoreRecordMap[T]) {
  return objectStore(storeName, "readwrite").add(record);
}

function put<T extends IDBStoreName>(storeName: T, record: IDBStoreRecordMap[T]) {
  return objectStore(storeName, "readwrite").put(record);
}

function deleteRecord(storeName: IDBStoreName, id: string) {
  return objectStore(storeName, "readwrite").delete(id);
}

function getAllAsync() {
  return new Promise<AllData>((resolve, reject) => {
    const all: AllData = {
      comps: [],
      surveys: [],
      fields: [],
      entries: [],
    };

    const tx = transaction(["comps", "surveys", "fields", "entries"]);

    const compsReq = tx.objectStore("comps").getAll();
    compsReq.onsuccess = () => {
      all.comps = compsReq.result;
    };

    const surveysReq = tx.objectStore("surveys").getAll();
    surveysReq.onsuccess = () => {
      all.surveys = surveysReq.result;
    };

    const fieldsReq = tx.objectStore("fields").getAll();
    fieldsReq.onsuccess = () => {
      all.fields = fieldsReq.result;
    };

    const entriesReq = tx.objectStore("entries").getAll();
    entriesReq.onsuccess = () => {
      all.entries = entriesReq.result;
    };

    tx.oncomplete = () => resolve(all);
    tx.onerror = () => reject(tx.error);
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6).padStart(4, "0");
}

export const idb = {
  init,
  database,
  transaction,
  objectStore,
  add,
  put,
  delete: deleteRecord,
  getAllAsync,
  generateId,
};

function updateObjectStores(request: IDBOpenDBRequest) {
  const storeNames = request.result.objectStoreNames;

  if (!storeNames.contains("entries")) {
    const entryStore = request.result.createObjectStore("entries", { keyPath: "id" });
    entryStore.createIndex("surveyId", "surveyId", { unique: false });
  } else if (request.transaction) {
    const entryStore = request.transaction.objectStore("entries");
    if (!entryStore.indexNames.contains("surveyId")) {
      entryStore.createIndex("surveyId", "surveyId", { unique: false });
    }
  }

  if (!storeNames.contains("fields")) {
    const fieldStore = request.result.createObjectStore("fields", { keyPath: "id" });
    fieldStore.createIndex("surveyId", "surveyId", { unique: false });
  } else if (request.transaction) {
    const fieldStore = request.transaction.objectStore("fields");
    if (!fieldStore.indexNames.contains("surveyId")) {
      fieldStore.createIndex("surveyId", "surveyId", { unique: false });
    }
  }

  if (!storeNames.contains("surveys")) {
    const surveyStore = request.result.createObjectStore("surveys", { keyPath: "id" });
    surveyStore.createIndex("compId", "compId", { unique: false });
  } else if (request.transaction) {
    const surveyStore = request.transaction.objectStore("surveys");
    if (!surveyStore.indexNames.contains("compId")) {
      surveyStore.createIndex("compId", "compId", { unique: false });
    }
  }

  if (!storeNames.contains("comps")) {
    request.result.createObjectStore("comps", { keyPath: "id" });
  }
}

function migrateData(transaction: IDBTransaction) {
  const compStore = transaction.objectStore("comps");
  const surveyStore = transaction.objectStore("surveys");
  const fieldStore = transaction.objectStore("fields");
  const entryStore = transaction.objectStore("entries");

  const compIdMap = new Map<number, string>();
  const surveyIdMap = new Map<number, string>();
  const fieldIdMap = new Map<number, string>();
  const entryIdMap = new Map<number, string>();

  const compsRequest = compStore.getAll();
  compsRequest.onsuccess = () => {
    for (const comp of compsRequest.result) {
      if (typeof comp.id == "number") {
        compStore.delete(comp.id);
        const newId = compIdMap.get(comp.id) || generateId();
        compIdMap.set(comp.id, newId);
        comp.id = newId;
        compStore.put(comp);
      }
    }
  };

  const surveysRequest = surveyStore.getAll();
  surveysRequest.onsuccess = () => {
    for (const survey of surveysRequest.result) {
      if (typeof survey.id == "number") {
        surveyStore.delete(survey.id);
        const newId = surveyIdMap.get(survey.id) || generateId();
        surveyIdMap.set(survey.id, newId);
        survey.id = newId;
      }

      if (!survey.compId) {
        const compId = survey.tbaEventKey || generateId();

        const comp: Comp = {
          id: compId,
          name: survey.name,
          matches: survey.matches,
          teams: survey.teams,
          created: survey.created,
          modified: survey.modified,
        };
        if (survey.tbaEventKey) {
          comp.tbaEventKey = survey.tbaEventKey;
        }
        if (survey.scouts) {
          comp.scouts = survey.scouts;
        }

        compStore.put(comp);

        survey.compId = compId;
        survey.name = survey.type == "pit" ? "Pit Survey" : "Match Survey";
        delete survey.tbaEventKey;
        delete survey.matches;
        delete survey.teams;
        delete survey.scouts;
      } else if (typeof survey.compId == "number") {
        const newId = compIdMap.get(survey.compId) || generateId();
        compIdMap.set(survey.compId, newId);
        survey.compId = newId;
      }

      survey.fieldIds = survey.fieldIds.map((id: any) => {
        if (typeof id == "number") {
          const newId = fieldIdMap.get(id) || generateId();
          fieldIdMap.set(id, newId);
          return newId;
        }
        return id;
      });

      surveyStore.put(survey);
    }
  };

  const fieldsRequest = fieldStore.getAll();
  fieldsRequest.onsuccess = () => {
    for (const field of fieldsRequest.result) {
      if (typeof field.id == "number") {
        fieldStore.delete(field.id);
        const newId = fieldIdMap.get(field.id) || generateId();
        fieldIdMap.set(field.id, newId);
        field.id = newId;
      }

      if (typeof field.surveyId == "number") {
        const newId = surveyIdMap.get(field.surveyId) || generateId();
        surveyIdMap.set(field.surveyId, newId);
        field.surveyId = newId;
      }

      if (field.type == "group") {
        field.fieldIds = field.fieldIds.map((id: any) => {
          if (typeof id == "number") {
            const newId = fieldIdMap.get(id) || generateId();
            fieldIdMap.set(id, newId);
            return newId;
          }
          return id;
        });
      }

      fieldStore.put(field);
    }
  };

  const entriesRequest = entryStore.getAll();
  entriesRequest.onsuccess = () => {
    for (const entry of entriesRequest.result) {
      if (typeof entry.id == "number") {
        entryStore.delete(entry.id);
        const newId = entryIdMap.get(entry.id) || generateId();
        entryIdMap.set(entry.id, newId);
        entry.id = newId;
      }

      if (typeof entry.surveyId == "number") {
        const newId = surveyIdMap.get(entry.surveyId) || generateId();
        surveyIdMap.set(entry.surveyId, newId);
        entry.surveyId = newId;
      }

      entryStore.put(entry);
    }
  };
}
