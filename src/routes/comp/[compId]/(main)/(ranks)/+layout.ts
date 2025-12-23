import { sortExpressions } from "$lib/expression";
import { getFieldsWithDetails } from "$lib/field";
import { groupRanks } from "$lib/survey";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const data = await event.parent();
  const searchParams = new URLSearchParams(event.url.hash.split("?")[1]);

  const surveyId = searchParams.get("surveyId");
  const pickListName = searchParams.get("picklist");
  const expressionName = searchParams.get("expression");
  const fieldId = searchParams.get("field");

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

  return {
    title: "Ranks",
    showRanking,
    groupedRanks,
    surveyId,
    pickListName,
    expressionName,
    fieldId,
  };
};
