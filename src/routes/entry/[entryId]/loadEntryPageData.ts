import type { Value } from "$lib";
import type { MatchEntry, PitEntry } from "$lib/entry";
import { getDefaultFieldValue, getFieldsWithDetails } from "$lib/field";
import { transaction } from "$lib/idb";
import type { MatchSurvey, PitSurvey, Survey } from "$lib/survey";

export function loadEntryPageData(entryId: number) {
  return new Promise<
    (
      | { surveyType: "match"; entryRecord: IDBRecord<MatchEntry>; surveyRecord: IDBRecord<MatchSurvey> }
      | { surveyType: "pit"; entryRecord: IDBRecord<PitEntry>; surveyRecord: IDBRecord<PitSurvey> }
    ) & {
      fieldsWithDetails: ReturnType<typeof getFieldsWithDetails>;
      defaultValues: Value[];
      teamName: string | undefined;
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
        const surveyRecord = surveyRequest.result as IDBRecord<Survey> | undefined;
        if (!surveyRecord) {
          return entryTransaction.abort();
        }

        const fieldsRequest = entryTransaction.objectStore("fields").index("surveyId").getAll(surveyRecord.id);

        fieldsRequest.onsuccess = () => {
          const fieldRecords = fieldsRequest.result;
          if (!fieldRecords) {
            return entryTransaction.abort();
          }

          const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);
          const defaultValues = fieldsWithDetails.orderedSingle.map((field) => getDefaultFieldValue(field.field));
          const teamName = surveyRecord.teams.find((t) => t.number == entryRecord.team)?.name;

          if (surveyRecord.type == "match") {
            resolve({ surveyType: "match", entryRecord, surveyRecord, fieldsWithDetails, defaultValues, teamName });
          } else {
            resolve({ surveyType: "pit", entryRecord, surveyRecord, fieldsWithDetails, defaultValues, teamName });
          }
        };
      };
    };
  });
}
