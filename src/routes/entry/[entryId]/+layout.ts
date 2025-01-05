import type { MatchEntry, PitEntry } from "$lib/entry";
import type { Field } from "$lib/field";
import { transaction } from "$lib/idb";
import type { MatchSurvey, PitSurvey } from "$lib/survey";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const entryId = Number(event.params.entryId);

  return await new Promise<
    | {
        surveyType: "match";
        entryRecord: IDBRecord<MatchEntry>;
        surveyRecord: IDBRecord<MatchSurvey>;
        fieldRecords: IDBRecord<Field>[];
      }
    | {
        surveyType: "pit";
        entryRecord: IDBRecord<PitEntry>;
        surveyRecord: IDBRecord<PitSurvey>;
        fieldRecords: IDBRecord<Field>[];
      }
  >((resolve) => {
    const entryTransaction = transaction(["entries", "surveys", "fields"]);

    entryTransaction.onabort = () => {
      throw entryTransaction.error;
    };

    const entryRequest = entryTransaction.objectStore("entries").get(entryId);

    entryRequest.onsuccess = () => {
      const entryRecord = entryRequest.result;
      if (!entryRecord) {
        return entryTransaction.abort();
      }

      const surveyRequest = entryTransaction.objectStore("surveys").get(entryRecord.surveyId);

      surveyRequest.onsuccess = () => {
        const surveyRecord = surveyRequest.result;
        if (!surveyRecord) {
          return entryTransaction.abort();
        }

        const fieldsRequest = entryTransaction.objectStore("fields").index("surveyId").getAll(surveyRecord.id);

        fieldsRequest.onsuccess = () => {
          const fieldRecords = fieldsRequest.result;
          if (!fieldRecords) {
            return entryTransaction.abort();
          }

          if (surveyRecord.type == "match") {
            resolve({ surveyType: "match", entryRecord, surveyRecord, fieldRecords });
          } else {
            resolve({ surveyType: "pit", entryRecord, surveyRecord, fieldRecords });
          }
        };
      };
    };
  });
};
