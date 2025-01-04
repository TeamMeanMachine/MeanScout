import type { Entry, Survey } from "$lib";

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

  type IDBRecord<T> = T & { id: number };

  interface IDBTransaction {
    objectStore(name: "surveys"): IDBObjectStore;
    objectStore(name: "fields"): IDBObjectStore & { index(name: "surveyId"): IDBIndex };
    objectStore(name: "entries"): IDBObjectStore & { index(name: "surveyId"): IDBIndex };
  }

  interface IDBDatabase {
    transaction(
      storeNames: "surveys" | "fields" | "entries" | ("surveys" | "fields" | "entries")[],
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ): IDBTransaction;
  }
}

export {};
