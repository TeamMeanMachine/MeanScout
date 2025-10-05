<script lang="ts">
  import { CheckIcon, CloudDownloadIcon, LoaderIcon } from "@lucide/svelte";
  import Button from "./Button.svelte";
  import { invalidateAll } from "$app/navigation";
  import type { CompPageData } from "$lib/comp";
  import { idb } from "$lib/idb";
  import { tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";

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

    let dataPulled = false;

    try {
      dataPulled ||= await getMatchesFromTbaEvent();
    } catch (e) {
      getTbaDataError = "Error while trying to get matches";
      console.error(e);
    }

    try {
      dataPulled ||= await getTeamsFromTbaEvent();
    } catch (e) {
      getTbaDataError = "Error while trying to get teams";
      console.error(e);
    }

    if (dataPulled) {
      showCheck = true;
      showCheckTimeout = window.setTimeout(() => (showCheck = false), 1000);
    }

    isLoadingTbaData = false;
    invalidateAll();
  }

  async function getMatchesFromTbaEvent() {
    if (!pageData.compRecord.tbaEventKey) return false;

    const response = await tbaGetEventMatches(pageData.compRecord.tbaEventKey);

    if (response) {
      const matchesTx = idb.transaction(["comps", "entries"], "readwrite");
      matchesTx.onabort = () => {
        getTbaDataError = "Error while trying to get matches";
      };

      const matches = structuredClone($state.snapshot(pageData.compRecord.matches));

      for (const { match } of response) {
        const matchIndex = matches.findIndex((m) => m.number == match.number);

        if (matchIndex == -1) {
          matches.push(match);
        } else {
          matches[matchIndex] = match;
        }
      }

      const entryStore = matchesTx.objectStore("entries");
      for (const { match, breakdowns } of response) {
        if (!breakdowns) continue;

        for (const { team, tbaMetrics } of breakdowns) {
          const entries = pageData.entryRecords.filter(
            (e) => e.team == team && e.type == "match" && e.match == match.number,
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
