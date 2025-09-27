import { getFieldsWithDetails } from "$lib/field";
import { groupRanks } from "$lib/survey";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const matchSurveys = data.surveyRecords
    .filter((survey) => survey.type == "match")
    .toSorted((a, b) => a.name.localeCompare(b.name));

  const showRanking = data.fieldRecords.length && data.entryRecords.length;

  const groupedRanks = matchSurveys.flatMap((survey) => {
    const fieldsWithDetails = getFieldsWithDetails(
      survey,
      data.fieldRecords.filter((f) => f.surveyId == survey.id),
    );
    return groupRanks(survey, fieldsWithDetails.orderedSingle);
  });

  return { title: "Ranks", showRanking, groupedRanks };
};
