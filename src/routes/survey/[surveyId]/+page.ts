import { loadSurveyPageData } from "./loadSurveyPageData";
import type { PageLoad } from "./$types";
import type { Survey } from "$lib/survey";
import { objectStore } from "$lib/idb";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  const surveys = await new Promise<IDBRecord<Survey>[]>((resolve) => {
    const surveysRequest = objectStore("surveys").getAll();
    surveysRequest.onerror = () => resolve([]);
    surveysRequest.onsuccess = () => resolve(surveysRequest.result);
  });

  return {
    ...data,
    otherSurveys: surveys.filter((s) => s.id !== surveyId),
  };
};
