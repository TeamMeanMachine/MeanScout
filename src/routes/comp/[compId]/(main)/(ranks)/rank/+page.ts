import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import type { MatchEntry } from "$lib/entry";
import { getFieldsWithDetails } from "$lib/field";
import { getExpressionData, getFieldData, getPickListData } from "$lib/rank";
import { sortExpressions } from "$lib/expression";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  if (!data.surveyId) {
    error(404, "No survey id given");
  }

  const surveyRecord = data.surveyRecords.find((s) => s.id == data.surveyId);
  if (!surveyRecord) {
    error(404, `Survey not found with id ${data.surveyId}`);
  }
  if (surveyRecord.type != "match") {
    error(404, `${surveyRecord.name} (${surveyRecord.id}) is not a match survey`);
  }

  const sortedExpressions = surveyRecord.expressions.toSorted(sortExpressions);

  const usedExpressionNames = [
    ...surveyRecord.expressions.flatMap((e) => [
      ...(e.input.from == "expressions" ? e.input.expressionNames : []),
      ...(e.inputs || []).filter((i) => i.from == "expression").map((i) => i.expressionName),
    ]),
    ...surveyRecord.pickLists
      .flatMap((p) => p.weights)
      .filter((w) => w.from != "field")
      .map((w) => w.expressionName),
  ];

  const expressions = {
    survey: sortedExpressions.filter((e) => e.scope == "survey"),
    entry: sortedExpressions.filter((e) => e.scope == "entry"),
  };

  const entriesByTeam: Record<string, MatchEntry[]> = {};
  for (const entry of data.entryRecords.filter(
    (e): e is MatchEntry => e.surveyId == surveyRecord.id && e.type == "match" && e.status != "draft",
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

  if (data.pickListName) {
    const pickList = surveyRecord.pickLists.find((pl) => pl.name == data.pickListName);
    if (!pickList) {
      error(404, `Pick list not found with name ${data.pickListName}`);
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

    sessionStorage.setItem("rank-view", JSON.stringify({ surveyId: surveyRecord.id, pickList: data.pickListName }));

    return {
      title: pickList.name,
      surveyRecord,
      expressions,
      usedExpressionNames,
      fieldsWithDetails,
      entriesByTeam,
      output,
    };
  }

  if (data.expressionName) {
    const expression = surveyRecord.expressions.find((e) => e.name == data.expressionName);
    if (!expression) {
      error(404, `Expression not found with name ${data.expressionName}`);
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

    sessionStorage.setItem("rank-view", JSON.stringify({ surveyId: surveyRecord.id, expression: data.expressionName }));

    return {
      title: expression.name,
      surveyRecord,
      expressions,
      usedExpressionNames,
      fieldsWithDetails,
      entriesByTeam,
      output,
    };
  }

  if (data.fieldId) {
    const field = fieldsWithDetails.orderedSingle.find((f) => f.field.id == data.fieldId);
    if (!field) {
      error(404, `Field not found with id ${data.fieldId}`);
    }

    const output = getFieldData(data.compRecord, field, surveyRecord, entriesByTeam, fieldsWithDetails.orderedSingle);
    if (!output) {
      error(500, `Something went wrong generating an output for field ${field.detailedName}`);
    }

    sessionStorage.setItem("rank-view", JSON.stringify({ surveyId: surveyRecord.id, field: data.fieldId }));

    return {
      title: field.detailedName,
      surveyRecord,
      expressions,
      usedExpressionNames,
      fieldsWithDetails,
      entriesByTeam,
      output,
    };
  }

  error(404, "No ranking name given");
};
