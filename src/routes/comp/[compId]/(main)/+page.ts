import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await event.parent();

  const teamNames = new Map<string, string>();
  for (const team of data.compRecord.teams) {
    if (team.name) {
      teamNames.set(team.number, team.name);
    }
  }

  return { title: "Entries", teamNames };
};
