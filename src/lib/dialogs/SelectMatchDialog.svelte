<script lang="ts">
  import { compareMatches, sessionStorageStore, type Match, type MatchIdentifier } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { ChevronDownIcon, ChevronRightIcon, ListOrderedIcon } from "@lucide/svelte";

  let {
    matches,
    lastCompletedMatch,
    prefilled,
    onselect,
  }: {
    matches: (Match & { extraTeams?: string[] })[];
    lastCompletedMatch?: MatchIdentifier | undefined;
    prefilled: MatchIdentifier;
    onselect(match: MatchIdentifier): void;
  } = $props();

  const upcomingMatches = lastCompletedMatch
    ? matches.filter((match) => compareMatches(match, lastCompletedMatch!) > 0)
    : matches;

  const previousMatches = lastCompletedMatch
    ? matches.filter((match) => compareMatches(match, lastCompletedMatch!) <= 0).toReversed()
    : [];

  let matchesTab = $state<"upcoming" | "previous">("upcoming");

  let selectedMatch = $state($state.snapshot(prefilled));
</script>

<span>Select {upcomingMatches.length && previousMatches.length ? matchesTab : ""} match</span>

{#if upcomingMatches.length && previousMatches.length}
  <div class="flex gap-2 text-sm">
    <Button
      onclick={() => (matchesTab = "upcoming")}
      class="grow basis-0 {matchesTab == 'upcoming' ? 'font-bold' : 'font-light'}"
    >
      Upcoming
    </Button>

    <Button
      onclick={() => (matchesTab = "previous")}
      class="grow basis-0 {matchesTab == 'previous' ? 'font-bold' : 'font-light'}"
    >
      Previous
    </Button>
  </div>
{/if}

<div class="@container -m-1 flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
  {#if upcomingMatches.length && matchesTab == "upcoming"}
    {#each upcomingMatches as match}
      {@render matchRow(match)}
    {/each}
  {:else}
    {#each previousMatches as match}
      {@render matchRow(match)}
    {:else}
      <span class="text-sm">No matches.</span>
    {/each}
  {/if}
</div>

{#snippet matchRow(match: Match & { extraTeams?: string[] })}
  {@const selected = compareMatches(match, selectedMatch) == 0}
  {@const font = selected ? "font-bold" : "font-light"}

  <Button onclick={() => onselect($state.snapshot(match))} class="flex-nowrap! text-center! {font}">
    <div class="flex flex-col truncate">
      <div class="flex flex-wrap items-center gap-x-4">
        {#if match.red1 || match.red2 || match.red3}
          <div class="text-red flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
            {#if match.red1}
              <div class="min-w-13">{match.red1}</div>
            {/if}
            {#if match.red2}
              <div class="min-w-13">{match.red2}</div>
            {/if}
            {#if match.red3}
              <div class="min-w-13">{match.red3}</div>
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
              <div class="text-red min-w-8 {redWon || selected ? 'font-bold' : 'text-sm font-light'}">
                {match.redScore}
              </div>
              <div class="text-blue min-w-8 {blueWon || selected ? 'font-bold' : 'text-sm font-light'}">
                {match.blueScore}
              </div>
            </div>
          </div>
        {:else}
          <div class="min-w-8">
            {#if match.level && match.level != "qm"}
              {match.level}{match.set || 1}-{match.number}
            {:else}
              {match.number}
            {/if}
          </div>
        {/if}

        {#if match.blue1 || match.blue2 || match.blue3}
          <div class="text-blue flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
            {#if match.blue1}
              <div class="min-w-13">{match.blue1}</div>
            {/if}
            {#if match.blue2}
              <div class="min-w-13">{match.blue2}</div>
            {/if}
            {#if match.blue3}
              <div class="min-w-13">{match.blue3}</div>
            {/if}
          </div>
        {/if}

        {#if match.extraTeams?.length}
          <div class="flex flex-col gap-x-2 @lg:flex-row @lg:flex-wrap">
            {#each match.extraTeams as extraTeam}
              <div class="min-w-13">{extraTeam}</div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </Button>
{/snippet}
