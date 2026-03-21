import { idb } from "$lib/idb";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async () => {
  return { all: await idb.getAllAsync() };
};
