<script lang="ts">
  import { getMatchTeamFontWeight, sessionStorageStore, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import { teamStore } from "$lib/settings";
  import { getLastCompletedMatch } from "$lib/survey";
  import SurveyPageHeader from "../SurveyPageHeader.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const filterMatches = sessionStorageStore<"true" | "">("filter-matches", "");

  let matches = $derived(
    $filterMatches ? data.surveyRecord.matches.filter(matchHasTeamStore) : data.surveyRecord.matches,
  );

  const lastCompletedMatch = getLastCompletedMatch(data.surveyRecord, data.entryRecords);

  let upcomingMatches = $derived(
    matches.filter((match) => match.number > lastCompletedMatch).toSorted((a, b) => a.number - b.number),
  );

  let previousMatches = $derived(
    matches.filter((match) => match.number <= lastCompletedMatch).toSorted((a, b) => b.number - a.number),
  );

  function matchHasTeamStore(match: Match) {
    return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].includes($teamStore);
  }
</script>

<SurveyPageHeader surveyRecord={data.surveyRecord} page="matches" pageTitle="Matches" />

<div class="flex flex-col gap-3" style="view-transition-name:matches">
  {#if $teamStore}
    <div class="flex flex-wrap gap-2 text-sm">
      <Button
        onclick={() => ($filterMatches = "")}
        class={$filterMatches ? "font-light" : "font-bold"}
        style="view-transition-name:match-filter-all"
      >
        All
      </Button>
      <Button
        onclick={() => ($filterMatches = "true")}
        class={$filterMatches ? "font-bold" : "font-light"}
        style="view-transition-name:match-filter-team"
      >
        {$teamStore}
      </Button>
    </div>
  {/if}

  {#if upcomingMatches.length || previousMatches.length}
    {#snippet teamRow(match: Match)}
      <Button
        onclick={() => openDialog(ViewMatchDialog, { pageData: data, match })}
        class="col-span-full grid grid-cols-subgrid gap-x-3 text-center!"
      >
        <div>{match.number}</div>
        <div class="col-span-3 grid grid-cols-subgrid gap-x-3">
          <div class="text-red {getMatchTeamFontWeight(match.red1)}">{match.red1}</div>
          <div class="text-red {getMatchTeamFontWeight(match.red2)}">{match.red2}</div>
          <div class="text-red {getMatchTeamFontWeight(match.red3)}">{match.red3}</div>
          <div class="text-blue {getMatchTeamFontWeight(match.blue1)}">{match.blue1}</div>
          <div class="text-blue {getMatchTeamFontWeight(match.blue2)}">{match.blue2}</div>
          <div class="text-blue {getMatchTeamFontWeight(match.blue3)}">{match.blue3}</div>
        </div>
      </Button>
    {/snippet}

    <div class="flex flex-wrap gap-2">
      {#if upcomingMatches.length}
        <div class="flex grow basis-0 flex-col">
          <span class="text-xs">Upcoming</span>
          <div class="grid grid-cols-[repeat(4,min-content)_auto] gap-2">
            {#each upcomingMatches as match (match)}
              {@render teamRow(match)}
            {/each}
          </div>
        </div>
      {/if}

      {#if previousMatches.length}
        <div class="flex grow basis-0 flex-col">
          <span class="text-xs">Previous</span>
          <div class="grid grid-cols-[repeat(4,min-content)_auto] gap-2">
            {#each previousMatches as match (match)}
              {@render teamRow(match)}
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    No matches.
  {/if}
</div>
