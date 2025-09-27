import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import type { MatchEntry } from "$lib/entry";
import { getFieldsWithDetails } from "$lib/field";
import { getExpressionData, getFieldData, getPickListData } from "$lib/rank";

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

  const pickListName = searchParams.get("picklist");
  const expressionName = searchParams.get("expression");
  const fieldId = searchParams.get("field");

  if (pickListName) {
    const pickList = surveyRecord.pickLists.find((pl) => pl.name == pickListName);
    if (!pickList) {
      error(404, `Pick list not found with name ${pickListName}`);
    }

    const output = getPickListData(
      data.compRecord,
      pickList,
      surveyRecord,
      entriesByTeam,
      fieldsWithDetails.orderedSingle,
    );
    if (!output) {
      error(500, `Something went wrong generating an output for pick list ${pickList.name}`);
    }

    sessionStorage.setItem("rank-view", JSON.stringify({ surveyId: surveyRecord.id, pickList: pickListName }));

    return { title: pickList.name, surveyRecord, entriesByTeam, output };
  }

  if (expressionName) {
    const expression = surveyRecord.expressions.find((e) => e.name == expressionName);
    if (!expression) {
      error(404, `Expression not found with name ${expressionName}`);
    }

    const output = getExpressionData(
      data.compRecord,
      expression,
      surveyRecord,
      entriesByTeam,
      fieldsWithDetails.orderedSingle,
    );
    if (!output) {
      error(500, `Something went wrong generating an output for expression ${expression.name}`);
    }

    sessionStorage.setItem("rank-view", JSON.stringify({ surveyId: surveyRecord.id, expression: expressionName }));

    return { title: expression.name, surveyRecord, entriesByTeam, output };
  }

  if (fieldId) {
    const field = fieldsWithDetails.orderedSingle.find((f) => f.field.id == fieldId);
    if (!field) {
      error(404, `Field not found with id ${fieldId}`);
    }

    const output = getFieldData(data.compRecord, field, surveyRecord, entriesByTeam, fieldsWithDetails.orderedSingle);
    if (!output) {
      error(500, `Something went wrong generating an output for field ${field.detailedName}`);
    }

    sessionStorage.setItem("rank-view", JSON.stringify({ surveyId: surveyRecord.id, field: fieldId }));

    return { title: field.detailedName, surveyRecord, entriesByTeam, output };
  }

  error(404, "No ranking name given");
};
