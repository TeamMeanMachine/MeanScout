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
    objectStore(name: "entries"): IDBObjectStore & { index(name: "surveyId"): IDBIndex };
  }

  interface IDBDatabase {
    transaction(
      storeNames: "surveys" | "entries" | ("surveys" | "entries")[],
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ): IDBTransaction;
  }

  type DetectedBarcode = {
    boundingBox: DOMRectReadOnly;
    cornerPoints: any;
    format: "qr_code";
    rawValue: string;
  };

  declare class BarcodeDetector {
    constructor({ formats }: { formats: ["qr_code"] });
    detect(imageBitmapSource: ImageBitmapSource): Promise<DetectedBarcode[]>;
  }
}

export {};
