import { idb } from "$lib/idb";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  const compRecords = await idb.getAll({ from: "comps" });

  localStorage.removeItem("comp");
  localStorage.removeItem("survey");

  return { compRecords };
};
