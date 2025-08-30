import type { Value } from "$lib";
import type { Comp } from "$lib/comp";
import type { Entry, MatchEntry, PitEntry } from "$lib/entry";
import { getDefaultFieldValue, getFieldsWithDetails } from "$lib/field";
import { idb } from "$lib/idb";
import type { MatchSurvey, PitSurvey } from "$lib/survey";
import type { PageLoad } from "./$types";

type EntryPageData = {
  compRecord: Comp;
  fieldsWithDetails: ReturnType<typeof getFieldsWithDetails>;
  defaultValues: Value[];
  teamName: string | undefined;
  thisCompEntries: Entry[];
} & (
  | { surveyType: "match"; entryRecord: MatchEntry; surveyRecord: MatchSurvey }
  | { surveyType: "pit"; entryRecord: PitEntry; surveyRecord: PitSurvey }
);

export const load: PageLoad = async (event) => {
  const entryId = event.params.entryId;

  const all = await idb.getAllAsync();

  const entryRecord = all.entries.find((entry) => entry.id == entryId);
  if (!entryRecord) {
    throw new Error(`Entry record not found with id ${entryId}`);
  }

  const surveyRecord = all.surveys.find((survey) => survey.id == entryRecord.surveyId);
  if (!surveyRecord) {
    throw new Error(`Survey record not found with id ${entryRecord.surveyId}`);
  }

  const compRecord = all.comps.find((comp) => comp.id == surveyRecord.compId);
  if (!compRecord) {
    throw new Error(`Comp record not found with id ${surveyRecord.compId}`);
  }

  const fieldRecords = all.fields.filter((field) => field.surveyId == surveyRecord.id);

  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);
  const defaultValues = fieldsWithDetails.orderedSingle.map((field) => getDefaultFieldValue(field.field));
  const teamName = compRecord.teams.find((t) => t.number == entryRecord.team)?.name;

  const thisCompSurveys = all.surveys.filter((survey) => survey.compId == compRecord.id);
  const thisCompEntries = all.entries.filter((entry) => thisCompSurveys.some((survey) => survey.id == entry.surveyId));

  return {
    compRecord,
    fieldsWithDetails,
    defaultValues,
    teamName,
    thisCompEntries,
    surveyType: surveyRecord.type,
    entryRecord,
    surveyRecord,
  } as EntryPageData;
};
