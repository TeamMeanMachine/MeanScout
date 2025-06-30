import { schemaVersion } from "./";
import type { Comp } from "./comp";
import type { Entry } from "./entry";
import type { Field } from "./field";
import type { Survey } from "./survey";

type IDBStoreRecordMap = {
  comps: IDBRecord<Comp>;
  surveys: IDBRecord<Survey>;
  fields: IDBRecord<Field>;
  entries: IDBRecord<Entry>;
};

type IDBStoreIndexMap = {
  surveys: "compId";
  fields: "surveyId";
  entries: "surveyId";
};

export type IDBStoreName = keyof IDBStoreRecordMap;

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

function getAll<T extends IDBStoreName>({
  from,
  where,
  is,
}: {
  from: T;
  where?: T extends keyof IDBStoreIndexMap ? IDBStoreIndexMap[T] : undefined;
  is?: number;
}) {
  return new Promise<IDBStoreRecordMap[T][]>((resolve, reject) => {
    let req;

    if (where && is) {
      req = objectStore(from).index(where).getAll(is);
    } else {
      req = objectStore(from).getAll();
    }

    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function getOne<T extends IDBStoreName>({ from, is }: { from: T; is: number }) {
  return new Promise<IDBStoreRecordMap[T]>((resolve, reject) => {
    const req = objectStore(from).get(is);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      if (!req.result) {
        return reject(`No ${from} record found for id ${is}`);
      }

      resolve(req.result);
    };
  });
}

export const idb = { init, database, transaction, objectStore, getAll, getOne };

function updateObjectStores(request: IDBOpenDBRequest) {
  const storeNames = request.result.objectStoreNames;

  if (!storeNames.contains("entries")) {
    const entryStore = request.result.createObjectStore("entries", { keyPath: "id", autoIncrement: true });
    entryStore.createIndex("surveyId", "surveyId", { unique: false });
  } else if (request.transaction) {
    const entryStore = request.transaction.objectStore("entries");
    if (!entryStore.indexNames.contains("surveyId")) {
      entryStore.createIndex("surveyId", "surveyId", { unique: false });
    }
  }

  if (!storeNames.contains("fields")) {
    const fieldStore = request.result.createObjectStore("fields", { keyPath: "id", autoIncrement: true });
    fieldStore.createIndex("surveyId", "surveyId", { unique: false });
  } else if (request.transaction) {
    const fieldStore = request.transaction.objectStore("fields");
    if (!fieldStore.indexNames.contains("surveyId")) {
      fieldStore.createIndex("surveyId", "surveyId", { unique: false });
    }
  }

  if (!storeNames.contains("surveys")) {
    const surveyStore = request.result.createObjectStore("surveys", { keyPath: "id", autoIncrement: true });
    surveyStore.createIndex("compId", "compId", { unique: false });
  } else if (request.transaction) {
    const surveyStore = request.transaction.objectStore("surveys");
    if (!surveyStore.indexNames.contains("compId")) {
      surveyStore.createIndex("compId", "compId", { unique: false });
    }
  }

  if (!storeNames.contains("comps")) {
    request.result.createObjectStore("comps", { keyPath: "id", autoIncrement: true });
  }
}

function migrateData(transaction: IDBTransaction) {
  const compStore = transaction.objectStore("comps");
  const surveyStore = transaction.objectStore("surveys");

  const surveyCursorRequest = surveyStore.openCursor();
  surveyCursorRequest.onsuccess = async () => {
    const surveyCursor = surveyCursorRequest.result;
    if (!surveyCursor) return;

    const survey = surveyCursor.value;

    if (!survey.compId) {
      try {
        const { compId } = await createCompFromSurvey(compStore, structuredClone(survey));
        survey.compId = compId;
        survey.name = survey.type == "pit" ? "Pit Survey" : "Match Survey";
        delete survey.tbaEventKey;
        delete survey.matches;
        delete survey.teams;
        delete survey.scouts;
      } catch (error) {
        console.error(error);
        surveyCursor.continue();
        return;
      }
    }

    surveyCursor.update(survey);
    surveyCursor.continue();
  };
}

function createCompFromSurvey(compStore: IDBObjectStore, survey: any) {
  return new Promise<{ compId: IDBValidKey }>(async (resolve, reject) => {
    const request = compStore.add({
      name: survey.name,
      tbaEventKey: survey.tbaEventKey,
      matches: survey.matches,
      teams: survey.teams,
      scouts: survey.scouts,
      created: survey.created,
      modified: survey.modified,
    });

    request.onerror = () => {
      reject(`Could not create comp from survey ${survey.name} (id ${survey.id})`);
    };

    request.onsuccess = () => {
      resolve({ compId: request.result });
    };
  });
}
