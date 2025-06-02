import { getFieldsWithDetails } from "$lib/field";
import { transaction } from "$lib/idb";
import type { SurveyPageData } from "$lib/survey";

export function loadSurveyPageData(surveyId: number) {
  return new Promise<SurveyPageData>((resolve) => {
    const surveyTransaction = transaction(["surveys", "fields", "entries"]);

    surveyTransaction.onabort = () => {
      throw surveyTransaction.error;
    };

    const surveyRequest = surveyTransaction.objectStore("surveys").get(surveyId);

    surveyRequest.onsuccess = () => {
      const surveyRecord = surveyRequest.result;
      if (!surveyRecord) {
        return surveyTransaction.abort();
      }

      const entriesRequest = surveyTransaction.objectStore("entries").index("surveyId").getAll(surveyId);

      entriesRequest.onsuccess = () => {
        const entryRecords = entriesRequest.result;
        if (!entryRecords) {
          return surveyTransaction.abort();
        }

        const fieldsRequest = surveyTransaction.objectStore("fields").index("surveyId").getAll(surveyId);

        fieldsRequest.onsuccess = () => {
          const fieldRecords = fieldsRequest.result;
          if (!fieldRecords) {
            return surveyTransaction.abort();
          }

          localStorage.setItem("survey", surveyRecord.id);

          const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

          if (surveyRecord.type == "match") {
            resolve({ surveyType: "match", surveyRecord, fieldRecords, entryRecords, fieldsWithDetails });
          } else {
            resolve({ surveyType: "pit", surveyRecord, fieldRecords, entryRecords, fieldsWithDetails });
          }
        };
      };
    };
  });
}
