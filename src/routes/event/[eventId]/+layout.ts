import { error } from "@sveltejs/kit";
import { EventDB, MetaDB } from "$lib/db";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async (loadEvent) => {
  const eventId = loadEvent.params.eventId;
  await Promise.all([MetaDB.open(), EventDB.open(eventId)]);
  const event = MetaDB.events.get(eventId);
  if (!event) {
    error(404, `Event record not found with id ${eventId}`);
  }
  sessionStorage.setItem("home", loadEvent.url.hash);
  return { event };
};
