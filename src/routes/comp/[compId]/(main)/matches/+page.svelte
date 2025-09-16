<script lang="ts">
  import { sessionStorageStore, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { teamStore } from "$lib/settings";
  import {
    ChevronDownIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    ListOrderedIcon,
    MinusIcon,
    PlusIcon,
    SquareArrowOutUpRightIcon,
  } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import MatchDataTable from "$lib/components/MatchDataTable.svelte";
  import { z } from "zod";

  let { data }: PageProps = $props();

  const showData = sessionStorageStore<"expressions" | "raw">("entry-view-show-data", "expressions");

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let selecting = $state(false);
  let selectedMatch = $state(initialMatch());
  let debouncedSearch = $state(sessionStorage.getItem("match-search") || "");

  let debouncedSearchParts = $derived(
    debouncedSearch
      .split(" ")
      .map((part) => part.trim())
      .filter((part) => part)
      .map((part) => parseInt(part).toString()),
  );

  let filteredMatches = $state(data.matches.toSorted(sortMatches).filter(filterMatch));

  const matchToggleStateSchema = z.array(z.union([z.literal("upcoming"), z.literal("previous")])).catch(["upcoming"]);

  function getToggleState() {
    try {
      return JSON.parse(sessionStorage.getItem("matches-toggle-state") ?? "null");
    } catch {}
  }

  let matchToggleState = $state(matchToggleStateSchema.parse(getToggleState()));

  $effect(() => {
    sessionStorage.setItem("matches-toggle-state", JSON.stringify(matchToggleState));
  });

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
      debouncedSearch = value;
      sessionStorage.setItem("match-search", debouncedSearch);
      filteredMatches = data.matches.toSorted(sortMatches).filter(filterMatch);
    }, debounceTimeMillis);
  }

  function sortMatches(a: Match & { extraTeams?: string[] }, b: Match & { extraTeams?: string[] }) {
    return b.number - a.number;
  }

  function filterMatch(match: Match & { extraTeams?: string[] }) {
    if (!debouncedSearch) return true;

    return debouncedSearchParts.every((part) => {
      return [
        match.number.toString(),
        match.red1,
        match.red2,
        match.red3,
        match.blue1,
        match.blue2,
        match.blue3,
        ...(match.extraTeams || []),
      ].some((team) => {
        return parseInt(team).toString() == part;
      });
    });
  }

  function teamFontWeight(team: string) {
    if (debouncedSearch && debouncedSearchParts.includes(parseInt(team).toString())) {
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

<div class="flex flex-col gap-6">
  {#if !data.compRecord.matches.length}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold">Matches</h2>
      <span class="text-sm">No matches.</span>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between">
        <h2 class="font-bold">Matches</h2>

        <div class="flex gap-2">
          <Button
            disabled={!selectedMatch || selecting}
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
            disabled={!selectedMatch || selecting}
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
        <span class="pt-1 text-xs font-light">Tip: you can input multiple teams via spaces</span>
      </label>

      {#if !debouncedSearch || filteredMatches.length}
        {#if upcomingMatches.length}
          {@const isToggled = matchToggleState.includes("upcoming") || debouncedSearch}

          <div class="@container flex flex-col gap-2">
            <Button
              onclick={() => {
                if (debouncedSearch) return;
                if (matchToggleState.includes("upcoming")) {
                  matchToggleState = matchToggleState.filter((val) => val != "upcoming");
                } else {
                  matchToggleState.push("upcoming");
                }
              }}
              class="flex-nowrap!"
            >
              {#if isToggled}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class={matchToggleState.includes("upcoming") ? "font-bold" : "font-light"}>Upcoming</span>
                <div class="flex gap-0.5 text-sm">
                  {upcomingMatches.length}<ListOrderedIcon class="size-4" />
                </div>
              </div>
            </Button>

            {#if isToggled}
              {#each upcomingMatches as match}
                {@render matchRow(match)}
              {/each}
            {/if}
          </div>
        {/if}

        {#if previousMatches.length}
          {@const isToggled = matchToggleState.includes("previous") || debouncedSearch}

          <div class="@container flex flex-col gap-2">
            <Button
              onclick={() => {
                if (debouncedSearch) return;
                if (matchToggleState.includes("previous")) {
                  matchToggleState = matchToggleState.filter((val) => val != "previous");
                } else {
                  matchToggleState.push("previous");
                }
              }}
              class="flex-nowrap!"
            >
              {#if isToggled}
                <ChevronDownIcon class="text-theme shrink-0" />
              {:else}
                <ChevronRightIcon class="text-theme shrink-0" />
              {/if}
              <div class="flex grow items-center justify-between">
                <span class={matchToggleState.includes("previous") ? "font-bold" : "font-light"}>Previous</span>
                <div class="flex gap-0.5 text-sm">
                  {previousMatches.length}<ListOrderedIcon class="size-4" />
                </div>
              </div>
            </Button>

            {#if isToggled}
              {#each previousMatches as match}
                {@render matchRow(match)}
              {/each}
            {/if}
          </div>
        {/if}
      {/if}
    {/if}
  {/if}
</div>

{#snippet matchRow(match: Match & { extraTeams?: string[] })}
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
    <div class="flex flex-wrap items-center gap-x-4">
      {#if match.red1 || match.red2 || match.red3}
        <div class="text-red flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
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

      {#if match.redScore !== undefined && match.blueScore !== undefined}
        {@const redWon = match.redScore > match.blueScore}
        {@const blueWon = match.blueScore > match.redScore}

        <div class="flex flex-col flex-wrap items-center gap-x-2 self-center">
          <div class="min-w-8">{match.number}</div>
          <div class="flex items-center gap-x-2">
            <div class="text-red min-w-8 {redWon ? 'font-bold' : 'text-sm font-light'}">
              {match.redScore}
            </div>
            <div class="text-blue min-w-8 {blueWon ? 'font-bold' : 'text-sm font-light'}">
              {match.blueScore}
            </div>
          </div>
        </div>
      {:else}
        <div class="min-w-8">{match.number}</div>
      {/if}

      {#if match.blue1 || match.blue2 || match.blue3}
        <div class="text-blue flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
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
        <div class="flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
          {#each match.extraTeams as extraTeam}
            <div class="min-w-13 {teamFontWeight(extraTeam)}">{extraTeam}</div>
          {/each}
        </div>
      {/if}
    </div>
  </Button>
{/snippet}
