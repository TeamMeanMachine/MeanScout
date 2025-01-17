import { schemaVersion } from "$lib";
import type { Expression } from "./analysis";

let idb: IDBDatabase | undefined = undefined;

export function initIDB(callback: (error?: string) => void) {
  const request = indexedDB.open("MeanScout", schemaVersion);
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

  if (oldVersion < schemaVersion && request.transaction) {
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

    if (survey.type == "match") {
      if (!survey.pickLists) {
        survey.pickLists = [];
      }

      if (!survey.expressions) {
        survey.expressions = [];
      }
    }

    if (Array.isArray(survey.teams)) {
      survey.teams = survey.teams.map((team: any) => {
        if (typeof team == "string") {
          return { number: team, name: "" };
        }
        return team;
      });
    } else {
      survey.teams = [];
    }

    if (!Array.isArray(survey.fieldIds)) {
      survey.fieldIds = [];
    }

    if (Array.isArray(survey.fields)) {
      let flattenedIndex = 0;

      for (const field of survey.fields) {
        try {
          let migratedFieldId;

          ({ migratedFieldId, flattenedIndex } = await migrateField(
            fieldStore,
            field,
            survey.id,
            survey.expressions,
            flattenedIndex,
          ));

          survey.fieldIds.push(migratedFieldId);
        } catch (error) {
          console.error(error);
        }
      }

      delete survey.fields;
    }

    if (Array.isArray(survey.expressions)) {
      survey.expressions = survey.expressions.map((expression: any): Expression => {
        if (!expression.scope) {
          expression.scope = "survey";
        }

        if (Array.isArray(expression.inputs)) {
          if (expression.inputs.every((input: any) => input.from == "field")) {
            expression.from = "fields";
            expression.fieldIds = expression.inputs.map((input: any) => input.fieldId);
          } else if (expression.inputs.every((input: any) => input.from == "expression")) {
            expression.from = "expressions";
            expression.expressionNames = expression.inputs.map((input: any) => input.expressionName);
          } else {
            expression.from = "fields";
            expression.fieldIds = [];
          }

          delete expression.inputs;
        }

        return expression;
      });
    }

    migrateEntries(entryStore, survey.id);

    surveyCursor.update(survey);
    surveyCursor.continue();
  };
}

function migrateField(
  fieldStore: IDBObjectStore,
  field: any,
  surveyId: number,
  expressions: any[] | undefined,
  flattenedIndex: number,
) {
  return new Promise<{ migratedFieldId: IDBValidKey; flattenedIndex: number }>(async (resolve, reject) => {
    if (field.type == "group") {
      if (!Array.isArray(field.fieldIds)) {
        field.fieldIds = [];
      }

      if (Array.isArray(field.fields)) {
        for (const innerField of field.fields) {
          try {
            let migratedFieldId;

            ({ migratedFieldId, flattenedIndex } = await migrateField(
              fieldStore,
              innerField,
              surveyId,
              expressions,
              flattenedIndex,
            ));

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

    addRequest.onsuccess = () => {
      const migratedFieldId = addRequest.result;

      if (field.type != "group") {
        if (expressions?.length) {
          for (let expressionIndex = 0; expressionIndex < expressions.length; expressionIndex++) {
            expressions[expressionIndex].inputs = expressions[expressionIndex].inputs.map((input: any) => {
              if (input.from == "field" && input.fieldIndex == flattenedIndex) {
                input.fieldId = migratedFieldId;
                delete input.fieldIndex;
              }

              return input;
            });
          }
        }

        flattenedIndex++;
      }

      resolve({ migratedFieldId, flattenedIndex });
    };
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
