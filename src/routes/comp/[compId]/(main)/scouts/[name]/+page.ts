import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  const scoutData = data.predictionsPerScout.find((pps) => pps.scout == data.scout);
  if (!scoutData) {
    error(404, `Data for scout ${data.scout} not found`);
  }

  return { title: data.scout, ...scoutData };
};
