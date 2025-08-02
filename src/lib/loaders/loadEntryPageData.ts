import type { Value } from "$lib";
import type { Comp } from "$lib/comp";
import type { MatchEntry, PitEntry } from "$lib/entry";
import { getDefaultFieldValue, getFieldsWithDetails } from "$lib/field";
import { idb, type AllData } from "$lib/idb";
import type { MatchSurvey, PitSurvey } from "$lib/survey";

export type EntryPageData = {
  all: AllData;
  compRecord: Comp;
  fieldsWithDetails: ReturnType<typeof getFieldsWithDetails>;
  defaultValues: Value[];
  teamName: string | undefined;
} & (
  | { surveyType: "match"; entryRecord: MatchEntry; surveyRecord: MatchSurvey; entryRecords: MatchEntry[] }
  | { surveyType: "pit"; entryRecord: PitEntry; surveyRecord: PitSurvey; entryRecords: PitEntry[] }
);

export async function loadEntryPageData(entryId: string): Promise<EntryPageData> {
  const all = await idb.getAllAsync();

  const entryRecord = all.entries.find((entry) => entry.id == entryId);
  if (!entryRecord) {
    throw new Error(`Entry record not found with id ${entryId}`);
  }

  const surveyRecord = all.surveys.find((survey) => survey.id == entryRecord.surveyId);
  if (!surveyRecord) {
    throw new Error(`Survey record not found with id ${entryRecord.surveyId}`);
  }

  const entryRecords = all.entries.filter((entry) => entry.surveyId == surveyRecord.id);

  const compRecord = all.comps.find((comp) => comp.id == surveyRecord.compId);
  if (!compRecord) {
    throw new Error(`Comp record not found with id ${surveyRecord.compId}`);
  }

  const fieldRecords = all.fields.filter((field) => field.surveyId == surveyRecord.id);

  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);
  const defaultValues = fieldsWithDetails.orderedSingle.map((field) => getDefaultFieldValue(field.field));
  const teamName = compRecord.teams.find((t) => t.number == entryRecord.team)?.name;

  localStorage.setItem("home", `survey/${surveyRecord.id}`);

  return {
    all,
    compRecord,
    fieldsWithDetails,
    defaultValues,
    teamName,
    surveyType: surveyRecord.type,
    entryRecord,
    surveyRecord,
    entryRecords,
  } as EntryPageData;
}
