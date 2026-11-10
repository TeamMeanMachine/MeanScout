import type { LayoutLoad } from "./$types";
import { idb } from "#lib/idb.ts";

export const load: LayoutLoad = async () => {
  return { all: await idb.getAllAsync() };
};
