import type { Comp } from "$lib/comp";
import type { MatchEntry, PitEntry } from "$lib/entry";
import { getFieldsWithDetails, type Field } from "$lib/field";
import { idb, type AllData } from "$lib/idb";
import type { MatchSurvey, PitSurvey } from "$lib/survey";

export type SurveyPageData = {
  all: AllData;
  compRecord: Comp;
  fieldRecords: Field[];
  fieldsWithDetails: ReturnType<typeof getFieldsWithDetails>;
} & (
  | { surveyType: "match"; surveyRecord: MatchSurvey; entryRecords: MatchEntry[] }
  | { surveyType: "pit"; surveyRecord: PitSurvey; entryRecords: PitEntry[] }
);

export async function loadSurveyPageData(surveyId: string): Promise<SurveyPageData> {
  const all = await idb.getAllAsync();

  const surveyRecord = all.surveys.find((survey) => survey.id == surveyId);
  if (!surveyRecord) {
    throw new Error(`Survey record not found with id ${surveyId}`);
  }

  const compRecord = all.comps.find((comp) => comp.id == surveyRecord.compId);
  if (!compRecord) {
    throw new Error(`Comp record not found with id ${surveyRecord.compId}`);
  }

  const fieldRecords = all.fields.filter((field) => field.surveyId == surveyId);
  const entryRecords = all.entries.filter((entry) => entry.surveyId == surveyId);

  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  return {
    all,
    compRecord,
    fieldRecords,
    fieldsWithDetails,
    surveyType: surveyRecord.type,
    surveyRecord,
    entryRecords,
  } as SurveyPageData;
}
