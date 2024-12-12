let idb: IDBDatabase | undefined = undefined;

const latestVersion = 9;

export function initIDB(callback: (error?: string) => void) {
  const request = indexedDB.open("MeanScout", latestVersion);
  request.onerror = () => {
    callback(`${request.error?.message}`);
  };
  request.onupgradeneeded = (e) => migrate(request, e.oldVersion);

  request.onsuccess = () => {
    if (!request.result) {
      callback("Could not open IDB");
      return;
    }

    idb = request.result;
    callback();
  };
}

export function database() {
  if (!idb) throw new Error("IDB not ready");
  return idb;
}

export function transaction(
  storeNames: "surveys" | "fields" | "entries" | ("surveys" | "fields" | "entries")[],
  mode?: IDBTransactionMode,
  options?: IDBTransactionOptions,
) {
  return database().transaction(storeNames, mode, options);
}

export function objectStore(name: "surveys" | "fields" | "entries", mode?: IDBTransactionMode) {
  return database().transaction(name, mode).objectStore(name);
}

function migrate(request: IDBOpenDBRequest, oldVersion: number) {
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
    request.result.createObjectStore("surveys", { keyPath: "id", autoIncrement: true });
  }

  if (oldVersion < latestVersion && request.transaction) {
    migrateSurveys(request.transaction);
  }
}

function migrateSurveys(transaction: IDBTransaction) {
  const surveyStore = transaction.objectStore("surveys");
  const fieldStore = transaction.objectStore("fields");
  const entryStore = transaction.objectStore("entries");

  const surveyCursorRequest = surveyStore.openCursor();
  surveyCursorRequest.onsuccess = async () => {
    const surveyCursor = surveyCursorRequest.result;
    if (!surveyCursor) return;

    const survey = surveyCursor.value as any;

    if (!survey.type) {
      survey.type = "match";
    }

    if (survey.type == "match" && !Array.isArray(survey.matches)) {
      survey.matches = [];
    }

    if (!Array.isArray(survey.fieldIds)) {
      survey.fieldIds = [];
    }

    if (Array.isArray(survey.fields)) {
      for (const field of survey.fields) {
        try {
          const migratedFieldId = await migrateField(fieldStore, field, survey.id);
          survey.fieldIds.push(migratedFieldId);
        } catch (error) {
          console.error(error);
        }
      }

      delete survey.fields;
    }

    migrateEntries(entryStore, survey.id);

    if (survey.type == "match") {
      if (!survey.expressions) {
        survey.expressions = [];
      }

      if (!survey.pickLists) {
        survey.pickLists = [];
      }
    }

    surveyCursor.update(survey);
    surveyCursor.continue();
  };
}

function migrateField(fieldStore: IDBObjectStore, field: any, surveyId: number) {
  return new Promise<IDBValidKey>(async (resolve, reject) => {
    if (field.type == "group") {
      if (!Array.isArray(field.fieldIds)) {
        field.fieldIds = [];
      }

      if (Array.isArray(field.fields)) {
        for (const innerField of field.fields) {
          try {
            const migratedFieldId = await migrateField(fieldStore, innerField, surveyId);
            field.fieldIds.push(migratedFieldId);
          } catch (error) {
            return reject(error);
          }
        }

        delete field.fields;
      }
    }

    const addRequest = fieldStore.add({ ...field, surveyId });
    addRequest.onerror = () => reject(`Could not migrate field ${field.name} for survey id ${surveyId}`);
    addRequest.onsuccess = () => resolve(addRequest.result);
  });
}

function migrateEntries(entryStore: IDBObjectStore, surveyId: number) {
  const entryCursorRequest = entryStore.index("surveyId").openCursor(surveyId);
  entryCursorRequest.onerror = () => {};

  entryCursorRequest.onsuccess = () => {
    const entryCursor = entryCursorRequest.result;
    if (!entryCursor) return;

    const entry = entryCursor.value;

    if (!entry.type) {
      entry.type = "match";
    }

    if (!Array.isArray(entry.values)) {
      entry.values = [];
    }

    if (entry.team == undefined) {
      entry.team = (entry.values as any[]).shift() || "";
    }

    if (entry.type == "match") {
      if (entry.match == undefined) {
        entry.match = (entry.values as any[]).shift() || 1;
      }

      if (entry.absent == undefined) {
        entry.absent = (entry.values as any[]).shift() || false;
      }
    }

    entryCursor.update(entry);
    entryCursor.continue();
  };
}
