import { error } from "@sveltejs/kit";
import type { Comp } from "#lib/comp.js";
import type { MatchEntry, PitEntry } from "#lib/entry.js";
import { getFieldsWithDetails, type Field } from "#lib/field.js";
import type { MatchSurvey, PitSurvey } from "#lib/survey.js";
import type { LayoutLoad } from "./$types";

type SurveyPageData = {
  compRecord: Comp;
  fieldRecords: Field[];
  fieldsWithDetails: ReturnType<typeof getFieldsWithDetails>;
  survey:
    | { type: "match"; record: MatchSurvey; entryRecords: MatchEntry[] }
    | { type: "pit"; record: PitSurvey; entryRecords: PitEntry[] };
};

export const load: LayoutLoad = async (event) => {
  const surveyId = event.params.surveyId;

  const data = await event.parent();

  const surveyRecord = data.all.surveys.find((survey) => survey.id == surveyId);
  if (!surveyRecord) {
    error(404, `Survey record not found with id ${surveyId}`);
  }

  const compRecord = data.all.comps.find((comp) => comp.id == surveyRecord.compId);
  if (!compRecord) {
    error(404, `Comp record not found with id ${surveyRecord.compId}`);
  }

  const fieldRecords = data.all.fields.filter((field) => field.surveyId == surveyId);
  const entryRecords = data.all.entries.filter((entry) => entry.surveyId == surveyId);

  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  return {
    compRecord,
    fieldRecords,
    fieldsWithDetails,
    survey: { type: surveyRecord.type, record: surveyRecord, entryRecords },
  } as SurveyPageData;
};
