import type { PageLoad } from "./$types";
import { getAllMatches } from "#lib/match.ts";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  return {
    title: "Entries",
    ...getAllMatches(data.compRecord, data.entryRecords),
  };
};
