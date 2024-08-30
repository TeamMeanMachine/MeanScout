<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import DeleteMatchDialog from "./DeleteMatchDialog.svelte";
  import MatchDialog from "./MatchDialog.svelte";

  let {
    idb,
    surveyRecord,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<MatchSurvey>;
  } = $props();

  $effect(() => {
    idb.transaction("surveys", "readwrite").objectStore("surveys").put($state.snapshot(surveyRecord));
  });

  let matchDialog: MatchDialog | undefined = $state();

  let show = $state(false);

  let entryRecords = $state<IDBRecord<Entry>[]>([]);

  const entriesRequest = idb.transaction("entries").objectStore("entries").index("surveyId").getAll(surveyRecord.id);
  entriesRequest.onerror = () => (show = true);

  entriesRequest.onsuccess = () => {
    const entries = entriesRequest.result;
    if (!entries) return;

    entryRecords = entries;
    show = true;
  };
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Matches</h1>
</Header>

{#if $modeStore == "admin"}
  <div class="flex flex-col gap-2 p-3">
    <MatchDialog bind:this={matchDialog} bind:surveyRecord />
  </div>
{/if}

<div class="flex gap-2 p-3">
  {#if show && surveyRecord.matches.length}
    <table class="border-collapse">
      <thead>
        <tr>
          <th colspan={$modeStore == "admin" ? 2 : 1} class="text-right">Match</th>
          <th colspan="3">Teams</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each surveyRecord.matches.toSorted((a, b) => a.number - b.number) as match}
          {@const entry = entryRecords.find((e) => e.type == "match" && e.match == match.number)}
          <tr>
            {#if $modeStore == "admin"}
              <td>
                <div class="flex flex-wrap gap-2 p-2">
                  <Button onclick={() => matchDialog?.editMatch(match.number)}>
                    <Icon name="pen" />
                  </Button>
                  <DeleteMatchDialog bind:surveyRecord {match} />
                </div>
              </td>
            {/if}
            <td class="p-2 text-right">{match.number}</td>
            <td>
              <div class="flex flex-col gap-1 p-2 text-right">
                <span class="text-red">{match.red1}</span>
                <span class="text-blue">{match.blue1}</span>
              </div>
            </td>
            <td>
              <div class="flex flex-col gap-1 p-2 text-right">
                <span class="text-red">{match.red2}</span>
                <span class="text-blue">{match.blue2}</span>
              </div>
            </td>
            <td>
              <div class="flex flex-col gap-1 p-2 text-right">
                <span class="text-red">{match.red3}</span>
                <span class="text-blue">{match.blue3}</span>
              </div>
            </td>
            <td class="p-2 text-center capitalize">{entry?.status}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else if show}
    No matches.
  {:else}
    Loading...
  {/if}
</div>
