import { idb } from "#lib/idb.ts";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async () => {
  return { all: await idb.getAllAsync() };
};
