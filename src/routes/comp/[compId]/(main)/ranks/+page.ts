import { groupRanks } from "$lib/survey";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const matchSurveys = data.surveyRecords
    .filter((survey) => survey.type == "match")
    .toSorted((a, b) => a.name.localeCompare(b.name));

  const showRanking =
    data.fieldRecords.length &&
    data.entryRecords.length &&
    matchSurveys.some((survey) => survey.pickLists.length || survey.expressions.length);

  const groupedRanks = matchSurveys.flatMap(groupRanks);

  return { title: "Ranks", showRanking, groupedRanks };
};
