import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();
  if (!data.team) {
    error(404, `Team not found with number ${event.params.number}`);
  }

  sessionStorage.setItem("team-highlight", data.team.number);

  return {
    title: `Team ${data.team.number}`,
    team: data.team,
    anyData: data.teamsFromEntries.includes(data.team.number),
  };
};
