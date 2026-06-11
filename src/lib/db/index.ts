import { compDB } from "./comp.svelte";
import { metaDB } from "./meta.svelte";

export const db = {
  /**
   * Opens meta DB, and if compID is set, opens the corresponding comp DB.
   * Resolves after opening and getting all data.
   */
  open: (compId?: string) => Promise.all([metaDB.open(), compId ? compDB.open(compId) : undefined]),
  comp: compDB,
  meta: metaDB,
};
