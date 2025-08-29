import { loadCompPageData } from "$lib/loaders/loadCompPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await loadCompPageData(event.params.compId);
  localStorage.setItem("home", event.url.hash);

  const teamNames = new Map<string, string>();
  for (const team of data.compRecord.teams) {
    if (team.name) {
      teamNames.set(team.number, team.name);
    }
  }

  return { ...data, teamNames };
};
