import { type Field, fieldTypes, flattenFields } from "./field";

function migrateEntries(entryStore: IDBObjectStore, surveyId: number, flattenedFields: any[]) {
  const entryCursorRequest = entryStore.index("surveyId").openCursor(surveyId);
  entryCursorRequest.onerror = () => {};

  entryCursorRequest.onsuccess = () => {
    const entryCursor = entryCursorRequest.result;
    if (!entryCursor) return;

    const entry = entryCursor.value as any;

    if (!entry.type) {
      entry.type = "match";
    }

    flattenedFields.forEach((field, i) => {
      if (field.type == "team") {
        entry.team = entry.values[i];
        entry.values.splice(i, 1);
      }

      if (entry.type == "match") {
        if (field.type == "match") {
          entry.match = entry.values[i];
          entry.values.splice(i, 1);
        }

        if (field.type == "toggle" && field.name == "Absent") {
          entry.absent = entry.values[i];
          entry.values.splice(i, 1);
        }
      }
    });

    if (!entry.team) {
      entry.team = "";
    }

    if (entry.type == "match") {
      if (!entry.match) {
        entry.match = 1;
      }

      if (!entry.absent) {
        entry.absent = false;
      }
    }

    entryCursor.update(entry);
    entryCursor.continue();
  };
}

function migrateFields<T extends Field>(fields: T[]) {
  return fields
    .map((field) => {
      if (field.type == "group") {
        field.fields = migrateFields(field.fields);
      }
      return field;
    })
    .filter((field) => fieldTypes.includes(field.type) && !(field.type == "toggle" && field.name == "Absent"));
}

function migrateSurveys(transaction: IDBTransaction) {
  const surveyStore = transaction.objectStore("surveys");
  const entryStore = transaction.objectStore("entries");

  const surveyCursorRequest = surveyStore.openCursor();
  surveyCursorRequest.onsuccess = () => {
    const surveyCursor = surveyCursorRequest.result;
    if (!surveyCursor) return;

    const survey = surveyCursor.value as any;

    if (!survey.type) {
      survey.type = "match";
    }

    if (survey.type == "match" && !Array.isArray(survey.matches)) {
      survey.matches = [];
    }

    migrateEntries(entryStore, survey.id, flattenFields(survey.fields));

    survey.fields = migrateFields(survey.fields);

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

export function migrateIDB(request: IDBOpenDBRequest, oldVersion: number, newVersion: number) {
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

  if (!storeNames.contains("surveys")) {
    request.result.createObjectStore("surveys", { keyPath: "id", autoIncrement: true });
  }

  if (oldVersion < newVersion && request.transaction) {
    migrateSurveys(request.transaction);
  }
}
