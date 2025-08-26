<script lang="ts">
  import { type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import { teamStore } from "$lib/settings";
  import { ChevronDownIcon, ChevronUpIcon, ListOrderedIcon } from "@lucide/svelte";
  import CompPageHeader from "../CompPageHeader.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let selecting = $state(false);
  let selectedMatch = $state(initialMatch());
  let debouncedSearch = $state(sessionStorage.getItem("match-search") || "");
  let filteredMatches = $state(data.compRecord.matches.toSorted(sortMatches).filter(filterMatch));

  const upcomingMatches = $derived(
    filteredMatches.filter((match) => match.number > data.lastCompletedMatch).toSorted((a, b) => a.number - b.number),
  );

  const previousMatches = $derived(
    filteredMatches.filter((match) => match.number <= data.lastCompletedMatch).toSorted((a, b) => b.number - a.number),
  );

  function initialMatch() {
    const matchNumber = sessionStorage.getItem("match-view");
    if (!matchNumber) return;
    return data.compRecord.matches.find((match) => match.number.toString() == matchNumber);
  }

  function onsearchinput(value: string) {
    window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      debouncedSearch = value.trim().toLowerCase().replaceAll(" ", "");
      sessionStorage.setItem("match-search", debouncedSearch);
      filteredMatches = data.compRecord.matches.toSorted(sortMatches).filter(filterMatch);
    }, debounceTimeMillis);
  }

  function sortMatches(a: Match, b: Match) {
    return b.number - a.number;
  }

  function filterMatch(match: Match) {
    if (!debouncedSearch) return true;

    return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].some((team) => {
      return parseInt(team).toString() == parseInt(debouncedSearch).toString();
    });
  }

  function teamFontWeight(team: string) {
    if (debouncedSearch && parseInt(team).toString() == parseInt(debouncedSearch).toString()) {
      return "font-bold underline";
    }

    if (!debouncedSearch && team == $teamStore) {
      return "font-bold underline";
    }

    if (!debouncedSearch && !$teamStore) {
      return "";
    }

    return "font-light";
  }
</script>

<CompPageHeader pageData={data} page="matches" pageTitle="Matches" />

<div class="flex flex-col gap-6 max-md:mt-9 max-md:mb-20" style="view-transition-name:matches">
  {#if !data.compRecord.matches.length}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold md:hidden">Matches</h2>
      <span class="text-sm">No matches.</span>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold md:hidden">Matches</h2>

      <div class="flex flex-col gap-4">
        <Button onclick={() => (selecting = !selecting)} class="flex-nowrap!">
          <ListOrderedIcon class="text-theme shrink-0" />

          {#if selectedMatch}
            <div class="flex grow items-center gap-2 text-center">
              {@render matchRow(selectedMatch)}
            </div>
          {:else}
            <span class="grow">Select</span>
          {/if}

          {#if !selecting && selectedMatch}
            <ChevronDownIcon class="text-theme shrink-0" />
          {:else}
            <ChevronUpIcon class="text-theme shrink-0" />
          {/if}
        </Button>
      </div>
    </div>

    {#if !selecting && selectedMatch}
      <div class="flex flex-col gap-3">
        <ViewMatchDialog pageData={data} match={selectedMatch} />
      </div>
    {:else}
      <label class="flex flex-col text-sm">
        Search
        <input
          value={debouncedSearch}
          oninput={(e) => onsearchinput(e.currentTarget.value)}
          class="text-theme bg-neutral-800 p-2"
        />
      </label>

      {#if !debouncedSearch || filteredMatches.length}
        <div
          class={["flex flex-wrap gap-x-3 gap-y-6", (!upcomingMatches.length || !previousMatches.length) && "flex-col"]}
        >
          <div class={["flex grow flex-col", upcomingMatches.length && "basis-60"]}>
            <span class="text-xs">Upcoming</span>
            <div class="flex flex-col gap-3">
              {#each upcomingMatches as match}
                <Button
                  onclick={() => {
                    selecting = false;
                    scrollTo(0, 0);
                    selectedMatch = match;
                    filteredMatches = data.compRecord.matches.toSorted(sortMatches).filter(filterMatch);
                    sessionStorage.setItem("match-view", match.number.toString());
                  }}
                  class="flex-nowrap! text-center!"
                >
                  {@render matchRow(match)}
                </Button>
              {:else}
                <span class="text-sm">No upcoming matches.</span>
              {/each}
            </div>
          </div>

          <div class={["flex grow flex-col", previousMatches.length && "basis-60"]}>
            <span class="text-xs">Previous</span>
            <div class="flex flex-col gap-3">
              {#each previousMatches as match}
                <Button
                  onclick={() => {
                    selecting = false;
                    scrollTo(0, 0);
                    selectedMatch = match;
                    filteredMatches = data.compRecord.matches.toSorted(sortMatches).filter(filterMatch);
                    sessionStorage.setItem("match-view", match.number.toString());
                  }}
                  class="flex-nowrap! text-center!"
                >
                  {@render matchRow(match)}
                </Button>
              {:else}
                <span class="text-sm">No previous matches.</span>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>

{#snippet matchRow(match: Match)}
  <div class="min-w-8">{match.number}</div>
  <div class="flex flex-wrap gap-x-2">
    <div class="text-red flex flex-wrap gap-x-2">
      <div class="min-w-13 {teamFontWeight(match.red1)}">{match.red1}</div>
      <div class="min-w-13 {teamFontWeight(match.red2)}">{match.red2}</div>
      <div class="min-w-13 {teamFontWeight(match.red3)}">{match.red3}</div>
    </div>
    <div class="text-blue flex flex-wrap gap-x-2">
      <div class="min-w-13 {teamFontWeight(match.blue1)}">{match.blue1}</div>
      <div class="min-w-13 {teamFontWeight(match.blue2)}">{match.blue2}</div>
      <div class="min-w-13 {teamFontWeight(match.blue3)}">{match.blue3}</div>
    </div>
  </div>
{/snippet}
