<script lang="ts">
  import type { Match } from "$lib";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { EntryStatus, MatchEntry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import UpsertMatchDialog from "./UpsertMatchDialog.svelte";

  let {
    surveyRecord,
    entryRecords,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<MatchSurvey>;
    entryRecords: IDBRecord<MatchEntry>[];
  } = $props();

  let matchDialog: UpsertMatchDialog | undefined = $state();
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Matches</h1>
</Header>

{#if $modeStore == "admin"}
  <div class="flex flex-col gap-2 p-3">
    <UpsertMatchDialog bind:this={matchDialog} bind:surveyRecord />
  </div>
{/if}

{#snippet matchRow(match: Match, status: EntryStatus | undefined)}
  <td class="w-0 p-2">{match.number}</td>
  <td class="w-0">
    <div class="flex flex-col gap-1 p-2">
      <span class="text-red">{match.red1}</span>
      <span class="text-blue">{match.blue1}</span>
    </div>
  </td>
  <td class="w-0">
    <div class="flex flex-col gap-1 p-2">
      <span class="text-red">{match.red2}</span>
      <span class="text-blue">{match.blue2}</span>
    </div>
  </td>
  <td class="w-0">
    <div class="flex flex-col gap-1 p-2">
      <span class="text-red">{match.red3}</span>
      <span class="text-blue">{match.blue3}</span>
    </div>
  </td>
  <td class="p-2 text-left capitalize">{status}</td>
{/snippet}

{#if surveyRecord.matches.length}
  <table class="w-full border-separate border-spacing-y-2 p-3 text-right">
    <thead>
      <tr>
        <th colspan={$modeStore == "admin" ? 2 : 1} class="px-2">Match</th>
        <th colspan="3" class="px-2 text-center">Teams</th>
        <th class="px-2 text-left">Entry</th>
      </tr>
    </thead>
    <tbody>
      {#each surveyRecord.matches.toSorted((a, b) => a.number - b.number) as match}
        {@const entry = entryRecords.find((e) => e.match == match.number)}
        {#if $modeStore == "admin"}
          <tr
            tabindex="0"
            role="button"
            onclick={() => matchDialog?.editMatch(match.number)}
            onkeydown={(e) => {
              if (e.key == " " || e.key == "Enter") {
                e.preventDefault();
                matchDialog?.editMatch(match.number);
              }
            }}
            class="button cursor-pointer bg-neutral-800"
          >
            <td class="w-0 p-2"><Icon name="pen" /></td>
            {@render matchRow(match, entry?.status)}
          </tr>
        {:else}
          <tr>
            {@render matchRow(match, entry?.status)}
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
{:else}
  <div class="flex flex-col gap-2 p-3">No matches.</div>
{/if}
