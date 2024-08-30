<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import NewEntryDialog from "./NewEntryDialog.svelte";

  let {
    idb,
    surveyRecord,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  $effect(() => {
    idb.transaction("surveys", "readwrite").objectStore("surveys").put($state.snapshot(surveyRecord));
  });

  let entryRecords = $state<IDBRecord<Entry>[]>([]);
  let draftEntries = $state<IDBRecord<Entry>[]>([]);
  let show = $state(false);

  const entriesRequest = idb.transaction("entries").objectStore("entries").index("surveyId").getAll(surveyRecord.id);
  entriesRequest.onerror = () => (show = true);

  entriesRequest.onsuccess = () => {
    const entries = entriesRequest.result;
    if (!entries) return;

    entryRecords = entries;
    draftEntries = entries.filter((entry) => entry.status == "draft");

    show = true;
  };

  function getTeamsFromAllMatches() {
    if (surveyRecord.type != "match") return [];

    let teams = new Set<string>();
    for (const match of surveyRecord.matches) {
      teams.add(match.red1);
      teams.add(match.red2);
      teams.add(match.red3);
      teams.add(match.blue1);
      teams.add(match.blue2);
      teams.add(match.blue3);
    }
    return [...teams];
  }
</script>

<Header backLink="">
  <h1 class="font-bold">{surveyRecord.name}</h1>
  {#if surveyRecord.tbaEventKey}
    <small>{surveyRecord.tbaEventKey}</small>
  {/if}
</Header>

<div class="flex flex-col gap-2 p-3">
  {#if show}
    <NewEntryDialog {idb} bind:surveyRecord {entryRecords} />
  {/if}
</div>

{#if show && draftEntries.length}
  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Drafts</h2>
    {#each draftEntries.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as draft (draft.id)}
      <Anchor route="entry/{draft.id}">
        <Icon name="arrow-right" />
        <div class="flex flex-col">
          <span><small>Team</small> {draft.team}</span>
          {#if draft.type == "match"}
            <span><small>Match</small> {draft.match}</span>
          {/if}
        </div>
      </Anchor>
    {/each}
  </div>
{/if}

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Survey</h2>

  <Anchor route="survey/{surveyRecord.id}/entries">
    <Icon name="list-ol" />
    <div class="flex flex-col">
      Entries
      <small>{entryRecords.length - draftEntries.length} completed</small>
    </div>
  </Anchor>

  {#if surveyRecord.type == "match"}
    <Anchor route="survey/{surveyRecord.id}/analysis">
      <Icon name="chart-simple" />
      <div class="flex flex-col">
        Analysis
        <small>{surveyRecord.pickLists.length} pick lists, {surveyRecord.expressions.length} expressions</small>
      </div>
    </Anchor>

    <Anchor route="survey/{surveyRecord.id}/matches">
      <Icon name="table-list" />
      <div class="flex flex-col">
        Matches
        <small>{surveyRecord.matches.length} total</small>
      </div>
    </Anchor>
  {/if}

  <Anchor route="survey/{surveyRecord.id}/teams">
    <Icon name="people-group" />
    <div class="flex flex-col">
      Teams
      <small>
        {#if surveyRecord.type == "match"}
          {getTeamsFromAllMatches().length} from matches,
        {/if}
        {surveyRecord.teams.length} added
      </small>
    </div>
  </Anchor>

  {#if $modeStore == "admin"}
    <Anchor route="survey/{surveyRecord.id}/fields">
      <Icon name="list-check" />
      <div class="flex flex-col">
        Fields
        <small>Configure, Preview</small>
      </div>
    </Anchor>

    <Anchor route="survey/{surveyRecord.id}/options">
      <Icon name="gears" />
      <div class="flex flex-col">
        Options
        <small>Export, TBA event</small>
      </div>
    </Anchor>
  {/if}
</div>
