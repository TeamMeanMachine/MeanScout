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
      surveyDerived: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "expressions"),
      surveyTba: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "tba"),
      surveyPrimitive: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "fields"),
      entryDerived: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "expressions"),
      entryTba: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "tba"),
      entryPrimitive: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "fields"),
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
