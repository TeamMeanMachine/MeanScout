import { getAllMatches } from "#lib/match.ts";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (event) => {
  const data = await event.parent();
  return { groupBy: event.params.group, ...getAllMatches(data.compRecord, data.entryRecords) };
};
