import type { MatchEntry, PitEntry } from "$lib/entry";
import type { Field } from "$lib/field";
import { transaction } from "$lib/idb";
import type { MatchSurvey, PitSurvey } from "$lib/survey";

export async function loadSurveyPageData(surveyId: number) {
  return await new Promise<
    | {
        surveyType: "match";
        surveyRecord: IDBRecord<MatchSurvey>;
        fieldRecords: IDBRecord<Field>[];
        entryRecords: IDBRecord<MatchEntry>[];
      }
    | {
        surveyType: "pit";
        surveyRecord: IDBRecord<PitSurvey>;
        fieldRecords: IDBRecord<Field>[];
        entryRecords: IDBRecord<PitEntry>[];
      }
  >((resolve) => {
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

          if (surveyRecord.type == "match") {
            resolve({ surveyType: "match", surveyRecord, fieldRecords, entryRecords });
          } else {
            resolve({ surveyType: "pit", surveyRecord, fieldRecords, entryRecords });
          }
        };
      };
    };
  });
}
