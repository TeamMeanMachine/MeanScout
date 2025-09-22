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
  import MatchRanksChart from "$lib/components/MatchRanksChart.svelte";
  import { goto } from "$app/navigation";

  let { data }: PageProps = $props();

  const matchSurveys = $derived(
    data.surveyRecords.filter((survey) => survey.type == "match").toSorted((a, b) => a.name.localeCompare(b.name)),
  );

  const showRanks = $derived(
    data.fieldRecords.length &&
      data.entryRecords.length &&
      matchSurveys.some((survey) => survey.pickLists.length || survey.expressions.length),
  );

  const showData = sessionStorageStore<"expressions" | "raw">("entry-view-show-data", "expressions");
  const showWhich = sessionStorageStore<"info" | "ranks" | "data">("match-view-show-which", "info");

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let selecting = $state(false);
  let selectedMatch = $state(initialMatch());

  const nextMatch = $derived.by(() => {
    if (!selectedMatch) return;
    return data.matches.find((match) => match.number == selectedMatch!.number + 1);
  });
  const previousMatch = $derived.by(() => {
    if (!selectedMatch) return;
    return data.matches.find((match) => match.number == selectedMatch!.number - 1);
  });

  const redWon = $derived(
    selectedMatch?.redScore !== undefined &&
      selectedMatch.blueScore !== undefined &&
      selectedMatch.redScore > selectedMatch.blueScore,
  );
  const blueWon = $derived(
    selectedMatch?.redScore !== undefined &&
      selectedMatch.blueScore !== undefined &&
      selectedMatch.redScore < selectedMatch.blueScore,
  );

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

  function onsearchenter() {
    if (upcomingMatches.length) {
      selectedMatch = upcomingMatches[0];
    } else if (previousMatches.length) {
      selectedMatch = previousMatches[0];
    } else {
      return;
    }

    selecting = false;
    scrollTo(0, 0);
    filteredMatches = data.matches.toSorted(sortMatches).filter(filterMatch);
    sessionStorage.setItem("match-view", selectedMatch.number.toString());

    const btn = document.querySelector(".regain-focus-after-search");
    if (btn instanceof HTMLButtonElement) {
      btn.focus();
    }
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

  function teamSearchFontWeight(team: string) {
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

  function teamWonFontWeight(team: string) {
    if (selectedMatch && selectedMatch.redScore !== undefined && selectedMatch.blueScore !== undefined) {
      if (redWon && [selectedMatch.red1, selectedMatch.red2, selectedMatch.red3].includes(team)) {
        return "font-bold";
      }

      if (blueWon && [selectedMatch.blue1, selectedMatch.blue2, selectedMatch.blue3].includes(team)) {
        return "font-bold";
      }

      return "font-light";
    }

    return "";
  }
</script>

<div class="flex flex-col gap-3">
  {#if !data.compRecord.matches.length}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold">Matches</h2>
      <span class="text-sm">No matches.</span>
    </div>
  {:else}
    <div class="flex flex-wrap items-center justify-between">
      <h2 class="font-bold">Matches</h2>

      <div class="flex gap-2">
        <Button
          disabled={!selectedMatch || selecting || !previousMatch}
          onclick={() => {
            if (!previousMatch) return;
            selectedMatch = previousMatch;
            sessionStorage.setItem("match-view", selectedMatch.number.toString());
          }}
          class="active:top-0! active:right-0.5!"
        >
          <MinusIcon class="text-theme size-5" />
        </Button>
        <Button
          disabled={!selectedMatch || selecting || !nextMatch}
          onclick={() => {
            if (!nextMatch) return;
            selectedMatch = nextMatch;
            sessionStorage.setItem("match-view", selectedMatch.number.toString());
          }}
          class="active:top-0! active:left-0.5!"
        >
          <PlusIcon class="text-theme size-5" />
        </Button>
      </div>
    </div>

    <Button onclick={() => (selecting = !selecting)} class="regain-focus-after-search flex-nowrap!">
      <ListOrderedIcon class="text-theme shrink-0" />

      {#if selectedMatch}
        <div class="flex grow flex-col">
          <span class="font-bold">Match {selectedMatch.number}</span>
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
        {#if selectedMatch.redScore !== undefined && selectedMatch.blueScore !== undefined}
          <div class="">
            {#if redWon}
              <span class="text-red font-bold">Red</span>
              won:
            {:else if blueWon}
              <span class="text-blue font-bold">Blue</span>
              won:
            {:else}
              <span class="font-bold">Tied:</span>
            {/if}
            <span class="text-red {redWon ? 'font-bold' : 'font-light'}">{selectedMatch.redScore}</span>
            <span class="text-sm">to</span>
            <span class="text-blue {blueWon ? 'font-bold' : 'font-light'}">{selectedMatch.blueScore}</span>
          </div>
        {/if}

        <div class="flex flex-wrap gap-2 text-sm">
          <Button onclick={() => ($showWhich = "info")} class={$showWhich == "info" ? "font-bold" : "font-light"}>
            Info
          </Button>
          {#if showRanks}
            <Button onclick={() => ($showWhich = "ranks")} class={$showWhich == "ranks" ? "font-bold" : "font-light"}>
              Ranks
            </Button>
          {/if}
          {#if data.hasExpressions}
            <Button
              onclick={() => {
                $showData = "expressions";
                $showWhich = "data";
              }}
              class={$showData == "expressions" && $showWhich == "data" ? "font-bold" : "font-light"}
            >
              Derived
            </Button>
          {/if}
          <Button
            onclick={() => {
              $showData = "raw";
              $showWhich = "data";
            }}
            class={$showData == "raw" && $showWhich == "data" ? "font-bold" : "font-light"}
          >
            Raw
          </Button>
        </div>
      </div>

      {#if $showWhich == "ranks" && showRanks}
        <MatchRanksChart pageData={data} match={selectedMatch} />
      {:else if $showWhich == "data"}
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
      {:else}
        <div class="flex flex-col gap-2 sm:grid sm:grid-cols-2">
          {#each [selectedMatch.red1, selectedMatch.red2, selectedMatch.red3] as team, index}
            {@const order = ["sm:order-1", "sm:order-3", "sm:order-5"]}
            {@const teamName = data.compRecord.teams.find((t) => t.number == team)?.name}

            <Button
              onclick={() => {
                sessionStorage.setItem("team-view", team);
                goto(`#/comp/${data.compRecord.id}/teams`);
              }}
              class={order[index]}
            >
              <div class="flex flex-col truncate {teamWonFontWeight(team)}">
                <span class="text-red">{team}</span>
                {#if teamName}
                  <span class="truncate text-xs">{teamName}</span>
                {/if}
              </div>
            </Button>
          {/each}

          {#each [selectedMatch.blue1, selectedMatch.blue2, selectedMatch.blue3] as team, index}
            {@const order = ["sm:order-2", "sm:order-4", "sm:order-6"]}
            {@const teamName = data.compRecord.teams.find((t) => t.number == team)?.name}

            <Button
              onclick={() => {
                sessionStorage.setItem("team-view", team);
                goto(`#/comp/${data.compRecord.id}/teams`);
              }}
              class={order[index]}
            >
              <div class="flex flex-col truncate {teamWonFontWeight(team)}">
                <span class="text-blue">{team}</span>
                {#if teamName}
                  <span class="truncate text-xs">{teamName}</span>
                {/if}
              </div>
            </Button>
          {/each}
        </div>
      {/if}

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
          {@attach (input) => {
            if (selectedMatch) {
              input.focus();
              input.select();
            }
          }}
          value={debouncedSearch}
          oninput={(e) => onsearchinput(e.currentTarget.value)}
          onkeypress={(e) => e.key == "Enter" && onsearchenter()}
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
            <div class="min-w-13 {teamSearchFontWeight(match.red1)}">{match.red1}</div>
          {/if}
          {#if match.red2}
            <div class="min-w-13 {teamSearchFontWeight(match.red2)}">{match.red2}</div>
          {/if}
          {#if match.red3}
            <div class="min-w-13 {teamSearchFontWeight(match.red3)}">{match.red3}</div>
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
            <div class="min-w-13 {teamSearchFontWeight(match.blue1)}">{match.blue1}</div>
          {/if}
          {#if match.blue2}
            <div class="min-w-13 {teamSearchFontWeight(match.blue2)}">{match.blue2}</div>
          {/if}
          {#if match.blue3}
            <div class="min-w-13 {teamSearchFontWeight(match.blue3)}">{match.blue3}</div>
          {/if}
        </div>
      {/if}

      {#if match.extraTeams?.length}
        <div class="flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
          {#each match.extraTeams as extraTeam}
            <div class="min-w-13 {teamSearchFontWeight(extraTeam)}">{extraTeam}</div>
          {/each}
        </div>
      {/if}
    </div>
  </Button>
{/snippet}
