import type { LayoutLoad } from "./$types";
import { getAllMatches } from "#lib/match.ts";

export const load: LayoutLoad = async (event) => {
  const data = await event.parent();
  return { groupBy: event.params.group, ...getAllMatches(data.compRecord, data.entryRecords) };
};
