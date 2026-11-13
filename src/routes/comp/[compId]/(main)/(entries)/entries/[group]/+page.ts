import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { groupEntries } from "#lib/entry.ts";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  if (!data.groupBy) {
    error(404, "No group by");
  }

  const groupedEntries = groupEntries(data.compRecord, data.surveyRecords, data.entryRecords, data.groupBy as any);

  const suggestedScouts = new Set([
    ...data.entryRecords.map((entry) => entry.scout).filter((scout) => scout !== undefined),
    ...(data.compRecord.scouts || []),
  ])
    .values()
    .toArray()
    .toSorted((a, b) => a.localeCompare(b));

  return { groupedEntries, suggestedScouts };
};
