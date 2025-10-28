<script lang="ts">
  import { compareMatches, matchUrl, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { teamStore } from "$lib/settings";
  import { ChevronDownIcon, ChevronRightIcon, ListOrderedIcon } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import { z } from "zod";
  import { goto } from "$app/navigation";
  import Anchor from "$lib/components/Anchor.svelte";

  let { data }: PageProps = $props();

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let debouncedSearch = $state(sessionStorage.getItem("match-search") || "");

  const debouncedSearchParts = $derived(
    debouncedSearch
      .split(" ")
      .map((part) => part.trim())
      .filter((part) => part)
      .map((part) => parseInt(part).toString()),
  );

  const filteredMatches = $derived(data.matches.filter(filterMatch));

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
    data.lastCompletedMatch
      ? filteredMatches.filter((match) => compareMatches(match, data.lastCompletedMatch!) > 0)
      : filteredMatches,
  );

  const previousMatches = $derived(
    data.lastCompletedMatch
      ? filteredMatches.filter((match) => compareMatches(match, data.lastCompletedMatch!) <= 0).toReversed()
      : [],
  );

  function onsearchinput(value: string) {
    window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      debouncedSearch = value;
      sessionStorage.setItem("match-search", debouncedSearch);
    }, debounceTimeMillis);
  }

  function onsearchenter() {
    if (upcomingMatches.length) {
      goto(`#/comp/${data.compRecord.id}/match/${upcomingMatches[0].number}`);
    } else if (previousMatches.length) {
      goto(`#/comp/${data.compRecord.id}/match/${previousMatches[0].number}`);
    }
  }

  function filterMatch(match: Match & { extraTeams?: string[] }) {
    if (!debouncedSearch) return true;

    return debouncedSearchParts.every((part) => {
      const queryables = [
        match.number.toString(),
        match.red1,
        match.red2,
        match.red3,
        match.blue1,
        match.blue2,
        match.blue3,
      ];

      if (match.extraTeams) queryables.push(...match.extraTeams);
      if (match.set && match.set > 1) queryables.push(match.set.toString());

      return queryables.some((team) => {
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
</script>

<div class="flex flex-col gap-6">
  {#if !data.matches.length}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold">Matches</h2>
      <span class="text-sm">No matches.</span>
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Matches</h2>
      <label class="flex flex-col text-sm">
        Search
        <input
          {@attach (input) => {
            if (sessionStorage.getItem("match-search")) {
              input.focus();
              input.select();
            }
          }}
          value={debouncedSearch}
          oninput={(e) => onsearchinput(e.currentTarget.value)}
          onkeypress={(e) => e.key == "Enter" && onsearchenter()}
          class="text-theme bg-neutral-800 p-2"
        />
      </label>
    </div>

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
</div>

{#snippet matchRow(match: Match & { extraTeams?: string[] })}
  <Anchor route={matchUrl(match, data.compRecord.id)} class="flex-nowrap! text-center!">
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
          <div class="min-w-8">
            {#if match.level && match.level != "qm"}
              {match.level}{match.set || 1}-{match.number}
            {:else}
              {match.number}
            {/if}
          </div>
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
  </Anchor>
{/snippet}
