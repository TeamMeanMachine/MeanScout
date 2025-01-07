import { getDetailedNestedFields, getDetailedSingleFields } from "$lib/field";
import type { PageLoad } from "./$types";
import { loadEntryPageData } from "./loadEntryPageData";

export const load: PageLoad = async (event) => {
  const entryId = Number(event.params.entryId);
  const data = await loadEntryPageData(entryId);
  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);
  const { detailedFields, detailedInnerFields } = getDetailedNestedFields(
    data.surveyRecord.fieldIds,
    data.fieldRecords,
  );
  return { ...data, fields, detailedFields, detailedInnerFields };
};
