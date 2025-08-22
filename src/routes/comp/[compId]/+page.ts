import { entryStatuses, type Entry } from "$lib/entry";
import { loadCompPageData } from "$lib/loaders/loadCompPageData";
import { targets } from "$lib/settings";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const data = await loadCompPageData(event.params.compId);

  const teamNames = new Map<string, string>();
  for (const team of data.compRecord.teams) {
    if (team.name) {
      teamNames.set(team.number, team.name);
    }
  }

  localStorage.setItem("home", event.url.hash);

  return {
    ...data,
    teamNames,
    entriesPerStatus: entriesPerStatus(),
    entriesPerSurvey: entriesPerSurvey(),
    entriesPerTeam: getEntriesPerTeam(),
    entriesPerMatch: getEntriesPerMatch(),
    entriesPerScout: getEntriesPerScout(),
    entriesPerTarget: getEntriesPerTarget(),
    entriesPerAbsent: getEntriesPerAbsent(),
  };

  function compareMatch(a: Entry, b: Entry) {
    if (a.type == "match" && b.type == "match") {
      return b.match - a.match;
    }

    if (a.type == "match" && b.type == "pit") {
      return 1;
    }

    if (a.type == "pit" && b.type == "match") {
      return -1;
    }

    return 0;
  }

  function getComparisons(a: Entry, b: Entry) {
    return {
      teamCompare: a.team.localeCompare(b.team, "en", { numeric: true }),
      matchCompare: compareMatch(a, b),
      scoutCompare: a.scout?.localeCompare(b.scout || "") || 0,
    };
  }

  function entriesPerStatus() {
    const sortedEntries = data.entryRecords.toSorted((a, b) => {
      const { teamCompare, matchCompare, scoutCompare } = getComparisons(a, b);

      if (matchCompare == 0 && a.type == "match" && b.type == "match") {
        const match = data.compRecord.matches.find((m) => m.number == a.match);
        if (match) {
          const targets = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
          const targetA = targets.findIndex((t) => t == a.team);
          const targetB = targets.findIndex((t) => t == b.team);
          return targetA - targetB || matchCompare || teamCompare || scoutCompare;
        }
      }

      return matchCompare || teamCompare || scoutCompare;
    });

    return entryStatuses
      .map((status) => {
        const entries = sortedEntries.filter((e) => e.status == status);
        if (entries.length) {
          return { status, entries };
        }
      })
      .filter((group) => group !== undefined);
  }

  function entriesPerSurvey() {
    const sortedEntries = data.entryRecords.toSorted((a, b) => {
      const { teamCompare, matchCompare, scoutCompare } = getComparisons(a, b);

      if (matchCompare == 0 && a.type == "match" && b.type == "match") {
        const match = data.compRecord.matches.find((m) => m.number == a.match);
        if (match) {
          const targets = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
          const targetA = targets.findIndex((t) => t == a.team);
          const targetB = targets.findIndex((t) => t == b.team);
          return targetA - targetB || matchCompare || teamCompare || scoutCompare;
        }
      }

      return matchCompare || teamCompare || scoutCompare;
    });

    return data.surveyRecords
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map((survey) => {
        const entries = sortedEntries.filter((e) => e.surveyId == survey.id);
        if (entries.length) {
          return { surveyId: survey.id, entries };
        }
      })
      .filter((group) => group !== undefined);
  }

  function getEntriesPerTeam() {
    const sortedEntries = data.entryRecords.toSorted((a, b) => {
      const { teamCompare, matchCompare, scoutCompare } = getComparisons(a, b);
      return teamCompare || matchCompare || scoutCompare;
    });

    const teamSet = new Set(data.entryRecords.map((entry) => entry.team));
    const teams = [...teamSet].toSorted((a, b) => parseInt(a) - parseInt(b));

    return teams
      .map((team) => {
        const entries = sortedEntries.filter((e) => e.team == team);
        if (entries.length) {
          return { team, teamName: teamNames.get(team), entries };
        }
      })
      .filter((group) => group !== undefined);
  }

  function getEntriesPerMatch() {
    const matchSet = new Set<number>();
    for (const entry of data.entryRecords) {
      if (entry.type != "match") continue;
      matchSet.add(entry.match);
    }

    const matches = [...matchSet].toSorted((a, b) => b - a);

    const sortedEntries = data.entryRecords.toSorted((a, b) => {
      const { teamCompare, matchCompare, scoutCompare } = getComparisons(a, b);

      if (matchCompare == 0 && a.type == "match" && b.type == "match") {
        const match = data.compRecord.matches.find((m) => m.number == a.match);
        if (match) {
          const targets = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
          const targetA = targets.findIndex((t) => t == a.team);
          const targetB = targets.findIndex((t) => t == b.team);
          return targetA - targetB || matchCompare || teamCompare || scoutCompare;
        }
      }

      return matchCompare || teamCompare || scoutCompare;
    });

    return matches
      .map((match) => {
        const entries = sortedEntries.filter((e) => e.type == "match" && e.match == match);
        if (entries.length) {
          return { match, entries };
        }
      })
      .filter((group) => group !== undefined);
  }

  function getEntriesPerScout() {
    const scouts = [
      ...new Set([
        "",
        ...data.entryRecords.map((entry) => entry.scout).filter((scout) => scout !== undefined),
        ...(data.compRecord.scouts || []),
      ]),
    ].toSorted((a, b) => a.localeCompare(b));

    const sortedEntries = data.entryRecords.toSorted((a, b) => {
      const { teamCompare, matchCompare, scoutCompare } = getComparisons(a, b);
      return scoutCompare || matchCompare || teamCompare;
    });

    return scouts
      .map((scout) => {
        const entries = sortedEntries.filter((e) => (e.scout || "") == scout);
        if (entries.length) {
          return { scout, entries };
        }
      })
      .filter((group) => group !== undefined);
  }

  function getEntriesPerTarget() {
    const sortedEntries = data.entryRecords.toSorted((a, b) => {
      const { teamCompare, matchCompare, scoutCompare } = getComparisons(a, b);
      return matchCompare || teamCompare || scoutCompare;
    });

    return targets
      .map((target) => {
        const entries = sortedEntries.filter((e) => {
          if (target == "pit" && e.type == "pit") {
            return true;
          }

          if (e.type != "match") return;

          const match = data.compRecord.matches.find((m) => m.number == e.match);
          if (!match) return;

          switch (target) {
            case "red 1":
              return e.team == match.red1;
            case "red 2":
              return e.team == match.red2;
            case "red 3":
              return e.team == match.red3;
            case "blue 1":
              return e.team == match.blue1;
            case "blue 2":
              return e.team == match.blue2;
            case "blue 3":
              return e.team == match.blue3;
          }
        });

        if (entries.length) {
          return { target, entries };
        }
      })
      .filter((group) => group !== undefined);
  }

  function getEntriesPerAbsent() {
    const sortedEntries = data.entryRecords.toSorted((a, b) => {
      const { teamCompare, matchCompare, scoutCompare } = getComparisons(a, b);
      return matchCompare || teamCompare || scoutCompare;
    });

    return [true, false]
      .map((absent) => {
        const entries = sortedEntries.filter((e) => {
          if (e.type != "match") return;
          return e.absent == absent;
        });

        if (entries.length) {
          return { absent, entries };
        }
      })
      .filter((group) => group !== undefined);
  }
};
