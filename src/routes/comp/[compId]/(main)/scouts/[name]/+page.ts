import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  const scoutData = data.predictionsPerScout.find(
    (pps) => pps.scout.name == data.scoutName && pps.scout.team == data.scoutTeam,
  );
  if (!scoutData) {
    error(404, `Data for scout ${data.scoutName} ${data.scoutTeam} not found`);
  }

  return { title: data.scoutName + (data.scoutTeam ? ` (${data.scoutTeam})` : ""), ...scoutData };
};
