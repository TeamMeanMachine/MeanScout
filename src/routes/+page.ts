import { idb } from "$lib/idb";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  sessionStorage.removeItem("home");
  return { all: await idb.getAllAsync() };
};
