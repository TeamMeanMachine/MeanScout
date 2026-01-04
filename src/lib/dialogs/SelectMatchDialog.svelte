<script lang="ts">
  import { compareMatches, matchLevels, type Match, type MatchIdentifier } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";

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

  let selectedMatch = $state($state.snapshot(prefilled));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onselect(selectedMatch);
      closeDialog();
    },
  };
</script>

<div class="flex flex-col gap-1">
  <span>Input match</span>
  <div class="flex items-end gap-2">
    <label class="flex grow basis-32 flex-col">
      <span class="text-xs font-light">Number</span>
      <input type="number" bind:value={selectedMatch.number} min="1" class="w-full bg-neutral-800 p-2 text-theme" />
    </label>
    <label class="flex basis-28 flex-col">
      <span class="text-xs font-light">Set</span>
      <input type="number" bind:value={selectedMatch.set} min="1" class="w-full bg-neutral-800 p-2 text-theme" />
    </label>
    <label class="flex flex-col">
      <span class="text-xs font-light">Level</span>
      <select bind:value={selectedMatch.level} class="bg-neutral-800 p-2 text-theme">
        {#each matchLevels as level}
          <option value={level}>{level}</option>
        {/each}
      </select>
    </label>
  </div>
</div>

<span class="text-sm">Or, select a match below</span>

<div class="@container -m-1 flex max-h-[400px] flex-col gap-2 overflow-auto p-1">
  {#if upcomingMatches.length}
    <span class="text-xs font-light">Upcoming matches</span>
    {#each upcomingMatches as match}
      {@render matchRow(match)}
    {/each}
  {/if}

  {#if previousMatches.length}
    <span class="text-xs font-light">Previous matches</span>
    {#each previousMatches as match}
      {@render matchRow(match)}
    {/each}
  {/if}

  {#if !upcomingMatches.length && !previousMatches.length}
    <span class="text-sm">No matches.</span>
  {/if}
</div>

{#snippet matchRow(match: Match & { extraTeams?: string[] })}
  {@const selected = compareMatches(match, selectedMatch) == 0}
  {@const font = selected ? "font-bold" : "font-light"}

  <Button
    onclick={() => {
      onselect(match);
      closeDialog();
    }}
    class="text-center! {font}"
  >
    <div class="flex flex-col truncate">
      <div class="flex flex-wrap items-center gap-x-4">
        {#if match.red1 || match.red2 || match.red3}
          <div class="flex flex-col gap-x-2 text-red @lg:flex-row @lg:flex-wrap">
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
              <div class="min-w-8 text-red {redWon || selected ? 'font-bold' : 'text-sm font-light'}">
                {match.redScore}
              </div>
              <div class="min-w-8 text-blue {blueWon || selected ? 'font-bold' : 'text-sm font-light'}">
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
          <div class="flex flex-col gap-x-2 text-blue @lg:flex-row @lg:flex-wrap">
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
