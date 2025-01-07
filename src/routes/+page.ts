import { objectStore } from "$lib/idb";
import type { Survey } from "$lib/survey";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  return {
    surveys: await new Promise<IDBRecord<Survey>[]>((resolve) => {
      const surveysRequest = objectStore("surveys").getAll();
      surveysRequest.onerror = () => resolve([]);
      surveysRequest.onsuccess = () => resolve(surveysRequest.result);
    }),
  };
};
