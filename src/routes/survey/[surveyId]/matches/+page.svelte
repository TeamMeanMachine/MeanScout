<script lang="ts">
  import type { Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import NewMatchDialog from "$lib/dialogs/NewMatchDialog.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import { objectStore } from "$lib/idb";
  import { modeStore, teamStore } from "$lib/settings";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let filterMatches = $state(false);

  let matches = $derived(
    filterMatches ? data.surveyRecord.matches.filter(matchHasTeamStore) : data.surveyRecord.matches,
  );

  let upcomingMatches = $derived(
    matches
      .filter((match) => !data.entryRecords.find((e) => e.status != "draft" && e.match == match.number))
      .toSorted((a, b) => a.number - b.number),
  );

  let previousMatches = $derived(
    matches
      .filter((match) => data.entryRecords.find((e) => e.status != "draft" && e.match == match.number))
      .toSorted((a, b) => b.number - a.number),
  );

  function matchHasTeamStore(match: Match) {
    return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].includes($teamStore);
  }

  function getFontWeight(team: string) {
    if (!$teamStore) return "";
    if (team == $teamStore) return "font-bold underline";
    return "font-light";
  }
</script>

<Header
  title="Matches - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Matches" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-3">
  {#if $modeStore == "admin"}
    <Button
      onclick={() =>
        openDialog(NewMatchDialog, {
          surveyRecord: data.surveyRecord,
          oncreate(match) {
            data = {
              ...data,
              surveyRecord: {
                ...data.surveyRecord,
                matches: [...data.surveyRecord.matches, match],
                modified: new Date(),
              },
            };
            objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
          },
        })}
    >
      <Icon name="plus" />
      New match
    </Button>
  {/if}

  {#if $teamStore}
    <div class="flex flex-wrap gap-2">
      <Button onclick={() => (filterMatches = false)} class={filterMatches ? "font-light" : "font-bold"}>All</Button>
      <Button onclick={() => (filterMatches = true)} class={filterMatches ? "font-bold" : "font-light"}>
        {$teamStore}
      </Button>
    </div>
  {/if}

  {#if upcomingMatches.length || previousMatches.length}
    {#snippet teamRow(match: Match)}
      <Button
        onclick={() => {
          openDialog(ViewMatchDialog, {
            data,
            match,
            onupdate(match: Match) {
              const matches = structuredClone($state.snapshot(data.surveyRecord.matches));
              const index = matches.findIndex((m) => m.number == match.number);
              if (index >= 0) matches[index] = match;

              data = {
                ...data,
                surveyRecord: { ...data.surveyRecord, matches, modified: new Date() },
              };
              objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
            },
            ondelete() {
              data = {
                ...data,
                surveyRecord: {
                  ...data.surveyRecord,
                  matches: data.surveyRecord.matches.filter((m) => m.number != match.number),
                  modified: new Date(),
                },
              };
              objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
            },
          });
        }}
        class="col-span-full grid grid-cols-subgrid gap-x-3 text-center"
      >
        <div>{match.number}</div>
        <div class="col-span-3 grid grid-cols-subgrid gap-x-3">
          <div class="text-red {getFontWeight(match.red1)}">{match.red1}</div>
          <div class="text-red {getFontWeight(match.red2)}">{match.red2}</div>
          <div class="text-red {getFontWeight(match.red3)}">{match.red3}</div>
          <div class="text-blue {getFontWeight(match.blue1)}">{match.blue1}</div>
          <div class="text-blue {getFontWeight(match.blue2)}">{match.blue2}</div>
          <div class="text-blue {getFontWeight(match.blue3)}">{match.blue3}</div>
        </div>
      </Button>
    {/snippet}

    <div class="flex flex-wrap gap-2">
      {#if upcomingMatches.length}
        <div class="flex grow basis-0 flex-col">
          <small>Upcoming</small>
          <div class="grid grid-cols-[repeat(4,_min-content)_auto] gap-2">
            {#each upcomingMatches as match (match)}
              {@render teamRow(match)}
            {/each}
          </div>
        </div>
      {/if}

      {#if previousMatches.length}
        <div class="flex grow basis-0 flex-col">
          <small>Previous</small>
          <div class="grid grid-cols-[repeat(4,_min-content)_auto] gap-2">
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
