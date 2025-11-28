import { sortExpressions } from "$lib/expression";
import { getFieldsWithDetails } from "$lib/field";
import { groupRanks } from "$lib/survey";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const matchSurveys = data.surveyRecords
    .filter((survey) => survey.type == "match")
    .toSorted((a, b) => a.name.localeCompare(b.name));

  const showRanking = data.fieldRecords.length && data.entryRecords.length;

  const groupedRanks = matchSurveys.map((survey) => {
    const fieldsWithDetails = getFieldsWithDetails(
      survey,
      data.fieldRecords.filter((f) => f.surveyId == survey.id),
    );

    const sortedExpressions = survey.expressions.toSorted(sortExpressions);

    const groupedExpressions = {
      survey: sortedExpressions.filter((e) => e.scope == "survey"),
      entry: sortedExpressions.filter((e) => e.scope == "entry"),
    };

    return {
      fieldsWithDetails,
      sortedExpressions,
      groupedExpressions,
      ...groupRanks(survey, fieldsWithDetails.orderedSingle),
    };
  });

  return { title: "Ranks", showRanking, groupedRanks };
};
