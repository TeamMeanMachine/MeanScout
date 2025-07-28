declare global {
  // See https://svelte.dev/docs/kit/types#app
  // for information about these interfaces
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  interface IDBTransaction {
    objectStore(name: "comps"): IDBObjectStore;
    objectStore(name: "surveys"): IDBObjectStore & { index(name: "compId"): IDBIndex };
    objectStore(name: "fields"): IDBObjectStore & { index(name: "surveyId"): IDBIndex };
    objectStore(name: "entries"): IDBObjectStore & { index(name: "surveyId"): IDBIndex };
  }
}

export {};
