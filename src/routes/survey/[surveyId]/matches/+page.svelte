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
      <Button onclick={() => openDialog(ViewMatchDialog, { pageData: data, match })} class="flex-nowrap! text-center!">
        <div class="min-w-8">{match.number}</div>
        <div class="flex flex-wrap gap-x-2">
          <div class="text-red flex flex-wrap gap-x-2">
            <div class="min-w-13 {getMatchTeamFontWeight(match.red1)}">{match.red1}</div>
            <div class="min-w-13 {getMatchTeamFontWeight(match.red2)}">{match.red2}</div>
            <div class="min-w-13 {getMatchTeamFontWeight(match.red3)}">{match.red3}</div>
          </div>
          <div class="text-blue flex flex-wrap gap-x-2">
            <div class="min-w-13 {getMatchTeamFontWeight(match.blue1)}">{match.blue1}</div>
            <div class="min-w-13 {getMatchTeamFontWeight(match.blue2)}">{match.blue2}</div>
            <div class="min-w-13 {getMatchTeamFontWeight(match.blue3)}">{match.blue3}</div>
          </div>
        </div>
      </Button>
    {/snippet}

    <div class="flex flex-wrap gap-2">
      <div class="flex grow basis-60 flex-col">
        <span class="text-xs">Upcoming</span>
        <div class="flex flex-col gap-2">
          {#each upcomingMatches as match}
            {@render teamRow(match)}
          {:else}
            <span class="text-sm">No upcoming matches.</span>
          {/each}
        </div>
      </div>

      <div class="flex grow basis-60 flex-col">
        <span class="col-span-full text-xs">Previous</span>
        <div class="flex flex-col gap-2">
          {#each previousMatches as match}
            {@render teamRow(match)}
          {:else}
            <span class="text-sm">No previous matches.</span>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    No matches.
  {/if}
</div>
