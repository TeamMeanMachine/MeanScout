<script lang="ts">
  import { sessionStorageStore, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { teamStore } from "$lib/settings";
  import {
    ChevronDownIcon,
    ChevronUpIcon,
    ListOrderedIcon,
    MinusIcon,
    PlusIcon,
    SquareArrowOutUpRightIcon,
  } from "@lucide/svelte";
  import CompPageHeader from "../CompPageHeader.svelte";
  import type { PageProps } from "./$types";
  import MatchDataTable from "$lib/components/MatchDataTable.svelte";

  let { data }: PageProps = $props();

  const showData = sessionStorageStore<"expressions" | "raw">("entry-view-show-data", "expressions");

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let selecting = $state(false);
  let selectedMatch = $state(initialMatch());
  let debouncedSearch = $state(sessionStorage.getItem("match-search") || "");
  let filteredMatches = $state(data.matches.toSorted(sortMatches).filter(filterMatch));

  const upcomingMatches = $derived(
    filteredMatches.filter((match) => match.number > data.lastCompletedMatch).toSorted((a, b) => a.number - b.number),
  );

  const previousMatches = $derived(
    filteredMatches.filter((match) => match.number <= data.lastCompletedMatch).toSorted((a, b) => b.number - a.number),
  );

  function initialMatch() {
    const matchNumber = sessionStorage.getItem("match-view");
    if (!matchNumber) return;
    return data.matches.find((match) => match.number.toString() == matchNumber);
  }

  function onsearchinput(value: string) {
    window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      debouncedSearch = value.trim().toLowerCase().replaceAll(" ", "");
      sessionStorage.setItem("match-search", debouncedSearch);
      filteredMatches = data.matches.toSorted(sortMatches).filter(filterMatch);
    }, debounceTimeMillis);
  }

  function sortMatches(a: Match & { extraTeams?: string[] }, b: Match & { extraTeams?: string[] }) {
    return b.number - a.number;
  }

  function filterMatch(match: Match & { extraTeams?: string[] }) {
    if (!debouncedSearch) return true;

    return [
      match.red1,
      match.red2,
      match.red3,
      match.blue1,
      match.blue2,
      match.blue3,
      ...(match.extraTeams || []),
    ].some((team) => {
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

<div class="mt-9 mb-20 flex flex-col gap-6 md:mt-0" style="view-transition-name:matches">
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
            <div class="flex grow flex-col">
              <span class="font-bold">Match {selectedMatch.number}</span>
              <span class="text-xs font-light">
                {[
                  selectedMatch.red1,
                  selectedMatch.red2,
                  selectedMatch.red3,
                  selectedMatch.blue1,
                  selectedMatch.blue2,
                  selectedMatch.blue3,
                  ...(selectedMatch.extraTeams || []),
                ]
                  .filter((team) => team)
                  .join(", ")}
              </span>
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

        {#if !selecting && selectedMatch}
          <div class="flex flex-wrap items-center justify-between gap-2">
            {#if data.hasExpressions}
              <div class="flex gap-2 text-sm">
                <Button
                  onclick={() => ($showData = "expressions")}
                  class={$showData == "expressions" ? "font-bold" : "font-light"}
                >
                  Derived
                </Button>
                <Button onclick={() => ($showData = "raw")} class={$showData == "raw" ? "font-bold" : "font-light"}>
                  Raw
                </Button>
              </div>
            {/if}

            <div class="flex gap-2">
              <Button
                onclick={() => {
                  const match = data.matches.find((match) => match.number == selectedMatch!.number - 1);
                  if (!match) return;
                  selectedMatch = match;
                  sessionStorage.setItem("match-view", match.number.toString());
                }}
              >
                <MinusIcon class="text-theme size-5" />
              </Button>
              <Button
                onclick={() => {
                  const match = data.matches.find((match) => match.number == selectedMatch!.number + 1);
                  if (!match) return;
                  selectedMatch = match;
                  sessionStorage.setItem("match-view", match.number.toString());
                }}
              >
                <PlusIcon class="text-theme size-5" />
              </Button>
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if !selecting && selectedMatch}
      {#each data.surveyRecords
        .filter((survey) => survey.type == "match")
        .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
        <div class="flex flex-col gap-1 overflow-x-auto">
          <h2 class="sticky left-0 font-bold">{surveyRecord.name}</h2>

          {#key selectedMatch}
            <MatchDataTable pageData={data} {surveyRecord} match={selectedMatch} show={$showData} />
          {/key}
        </div>
      {/each}

      {#if data.compRecord.tbaEventKey}
        <div class="flex flex-wrap gap-x-4">
          <a
            href="https://www.thebluealliance.com/match/{data.compRecord.tbaEventKey}_qm{selectedMatch.number}"
            target="_blank"
          >
            <span class="underline">TBA</span>
            <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
          </a>

          <a
            href="https://www.statbotics.io/match/{data.compRecord.tbaEventKey}_qm{selectedMatch.number}"
            target="_blank"
          >
            <span class="underline">Statbotics</span>
            <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
          </a>
        </div>
      {/if}
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
                    filteredMatches = data.matches.toSorted(sortMatches).filter(filterMatch);
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
                    filteredMatches = data.matches.toSorted(sortMatches).filter(filterMatch);
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

{#snippet matchRow(match: Match & { extraTeams?: string[] })}
  <div class="min-w-8">{match.number}</div>

  <div class="flex flex-wrap gap-x-2">
    {#if match.red1 || match.red2 || match.red3}
      <div class="text-red flex flex-wrap gap-x-2">
        {#if match.red1}
          <div class="min-w-13 {teamFontWeight(match.red1)}">{match.red1}</div>
        {/if}
        {#if match.red2}
          <div class="min-w-13 {teamFontWeight(match.red2)}">{match.red2}</div>
        {/if}
        {#if match.red3}
          <div class="min-w-13 {teamFontWeight(match.red3)}">{match.red3}</div>
        {/if}
      </div>
    {/if}

    {#if match.blue1 || match.blue2 || match.blue3}
      <div class="text-blue flex flex-wrap gap-x-2">
        {#if match.blue1}
          <div class="min-w-13 {teamFontWeight(match.blue1)}">{match.blue1}</div>
        {/if}
        {#if match.blue2}
          <div class="min-w-13 {teamFontWeight(match.blue2)}">{match.blue2}</div>
        {/if}
        {#if match.blue3}
          <div class="min-w-13 {teamFontWeight(match.blue3)}">{match.blue3}</div>
        {/if}
      </div>
    {/if}

    {#if match.extraTeams?.length}
      <div class="flex flex-wrap gap-x-2">
        {#each match.extraTeams as extraTeam}
          <div class="min-w-13 {teamFontWeight(extraTeam)}">{extraTeam}</div>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}
