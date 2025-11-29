<script lang="ts">
  import { CheckIcon, CloudDownloadIcon, LoaderIcon } from "@lucide/svelte";
  import Button from "./Button.svelte";
  import { invalidateAll } from "$app/navigation";
  import type { CompPageData } from "$lib/comp";
  import { idb } from "$lib/idb";
  import { tbaGetEventAlliances, tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";
  import { compareMatches } from "$lib";

  let {
    pageData,
  }: {
    pageData: CompPageData;
  } = $props();

  let getTbaDataError = $state("");
  let isLoadingTbaData = $state(false);
  let showCheck = $state(false);
  let showCheckTimeout = $state<number | undefined>();

  let hasMetrics = pageData.surveyRecords.some((s) => s.type == "match" && s.tbaMetrics?.length);

  async function getDataFromTbaEvent() {
    showCheck = false;
    window.clearTimeout(showCheckTimeout);

    getTbaDataError = "";
    isLoadingTbaData = true;

    try {
      const anyPulled = await Promise.all([
        getMatchesFromTbaEvent(),
        getTeamsFromTbaEvent(),
        getAlliancesFromTbaEvent(),
      ]);

      showCheck = anyPulled.includes(true);
    } catch (e) {
      getTbaDataError = "Error while trying to get data";
      console.error(e);
    }

    if (showCheck) {
      invalidateAll();
      showCheckTimeout = window.setTimeout(() => (showCheck = false), 1000);
    } else {
      window.clearTimeout(showCheckTimeout);
    }

    isLoadingTbaData = false;
  }

  async function getMatchesFromTbaEvent() {
    if (!pageData.compRecord.tbaEventKey) return false;

    try {
      const response = await tbaGetEventMatches(pageData.compRecord.tbaEventKey);

      if (response) {
        const matchesTx = idb.transaction(["comps", "entries"], "readwrite");
        matchesTx.onabort = () => {
          getTbaDataError = "Error while trying to get matches";
        };

        let matches = structuredClone($state.snapshot(pageData.compRecord.matches));

        for (const { match } of response) {
          const similarMatches = matches.filter((existingMatch) => compareMatches(existingMatch, match) == 0);
          if (similarMatches.length > 1) {
            matches = matches.filter((m) => compareMatches(m, match) != 0);
            matches.push(match);
            continue;
          }

          const matchIndex = matches.findIndex((existingMatch) => compareMatches(existingMatch, match) == 0);

          if (matchIndex == -1) {
            matches.push(match);
          } else {
            matches[matchIndex] = match;
          }
        }

        matches = matches.toSorted(compareMatches);

        const entryStore = matchesTx.objectStore("entries");
        for (const { match, breakdowns } of response) {
          if (!breakdowns) continue;

          for (const { team, tbaMetrics } of breakdowns) {
            const entries = pageData.entryRecords.filter(
              (e) => e.team == team && e.type == "match" && compareMatches(match, e) == 0,
            );
            for (const entry of entries) {
              entryStore.put({ ...$state.snapshot(entry), tbaMetrics });
            }
          }
        }

        pageData = {
          ...pageData,
          compRecord: { ...pageData.compRecord, matches, modified: new Date() },
        };
        matchesTx.objectStore("comps").put($state.snapshot(pageData.compRecord));
        return matches.length > 0;
      }
    } catch (e) {
      console.error(e);
    }

    return false;
  }

  async function getTeamsFromTbaEvent() {
    if (!pageData.compRecord.tbaEventKey) return false;

    const response = await tbaGetEventTeams(pageData.compRecord.tbaEventKey);
    if (response) {
      const teams = structuredClone($state.snapshot(pageData.compRecord.teams));
      for (const team of response) {
        const teamIndex = teams.findIndex((t) => t.number == team.number);
        if (teamIndex == -1) {
          teams.push(team);
        } else {
          teams[teamIndex] = team;
        }
      }

      pageData = {
        ...pageData,
        compRecord: { ...pageData.compRecord, teams, modified: new Date() },
      };
      idb.put("comps", $state.snapshot(pageData.compRecord));
      return teams.length > 0;
    }

    return false;
  }

  async function getAlliancesFromTbaEvent() {
    if (!pageData.compRecord.tbaEventKey) return false;

    const response = await tbaGetEventAlliances(pageData.compRecord.tbaEventKey);
    if (response) {
      pageData = {
        ...pageData,
        compRecord: { ...pageData.compRecord, alliances: response, modified: new Date() },
      };
      idb.put("comps", $state.snapshot(pageData.compRecord));
      return true;
    }

    return false;
  }
</script>

<Button onclick={getDataFromTbaEvent}>
  {#if isLoadingTbaData}
    <LoaderIcon class="text-theme animate-spin" />
  {:else if showCheck && !getTbaDataError}
    <CheckIcon class="text-theme" />
  {:else}
    <CloudDownloadIcon class="text-theme" />
  {/if}

  <div class="flex flex-col">
    Get data from TBA
    <span class="text-xs font-light">
      Matches,
      {hasMetrics ? "metrics," : ""}
      teams
    </span>
  </div>
</Button>

{#if getTbaDataError}
  <span>{getTbaDataError}</span>
{/if}
