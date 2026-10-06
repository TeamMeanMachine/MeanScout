import { idb } from "#lib/idb.js";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async () => {
  return { all: await idb.getAllAsync() };
};
