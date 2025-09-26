import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import type { MatchEntry } from "$lib/entry";
import { getFieldsWithDetails } from "$lib/field";
import { getExpressionData, getPickListData } from "$lib/analysis";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  const searchParams = new URLSearchParams(event.url.hash.split("?")[1]);

  const surveyId = searchParams.get("surveyId");
  if (!surveyId) {
    error(404, "No survey id given");
  }

  const surveyRecord = data.surveyRecords.find((s) => s.id == surveyId);
  if (!surveyRecord) {
    error(404, `Survey not found with id ${surveyId}`);
  }
  if (surveyRecord.type != "match") {
    error(404, `${surveyRecord.name} (${surveyRecord.id}) is not a match survey`);
  }

  const entriesByTeam: Record<string, MatchEntry[]> = {};
  for (const entry of data.entryRecords.filter(
    (e): e is MatchEntry => e.surveyId == surveyRecord.id && e.type == "match",
  )) {
    if (entry.team in entriesByTeam) {
      entriesByTeam[entry.team].push(entry);
    } else {
      entriesByTeam[entry.team] = [entry];
    }
  }

  const fieldsWithDetails = getFieldsWithDetails(
    surveyRecord,
    data.fieldRecords.filter((field) => field.surveyId == surveyRecord.id),
  );

  const pickListName = searchParams.get("pickList");
  const expressionName = searchParams.get("expression");

  if (pickListName) {
    const pickList = surveyRecord.pickLists.find((pl) => pl.name == pickListName);
    if (!pickList) {
      error(404, `Pick list not found with name ${pickListName}`);
    }

    const output = getPickListData(
      data.compRecord,
      pickList.name,
      surveyRecord,
      entriesByTeam,
      fieldsWithDetails.orderedSingle,
    );
    if (!output) {
      error(500, `Something went wrong generating an output for pick list ${pickList.name}`);
    }

    sessionStorage.setItem("analysis-view", JSON.stringify({ surveyId: surveyRecord.id, pickList: pickList.name }));

    return { title: pickList.name, surveyRecord, entriesByTeam, output };
  }

  if (expressionName) {
    const expression = surveyRecord.expressions.find((e) => e.name == expressionName);
    if (!expression) {
      error(404, `Expression not found with name ${expressionName}`);
    }

    const output = getExpressionData(
      data.compRecord,
      expression.name,
      surveyRecord,
      entriesByTeam,
      fieldsWithDetails.orderedSingle,
    );
    if (!output) {
      error(500, `Something went wrong generating an output for expression ${expression.name}`);
    }

    sessionStorage.setItem("analysis-view", JSON.stringify({ surveyId: surveyRecord.id, expression: expression.name }));

    return { title: expression.name, surveyRecord, entriesByTeam, output };
  }

  error(404, "No ranking name given");
};
