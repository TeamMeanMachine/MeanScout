<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import BulkSetEntryStatusDialog from "./BulkSetEntryStatusDialog.svelte";
  import ExportEntriesDialog from "./ExportEntriesDialog.svelte";
  import ImportEntriesDialog from "./ImportEntriesDialog.svelte";
  import ImportEntryDialog from "./ImportEntryDialog.svelte";

  let {
    idb,
    surveyRecord,
    entryRecords,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  let submittedEntries = $state(entryRecords.filter((entry) => entry.status == "submitted"));
  let exportedEntries = $state(entryRecords.filter((entry) => entry.status == "exported"));
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Entries</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  {#if $modeStore == "admin"}
    <ImportEntriesDialog {idb} {surveyRecord} bind:exportedEntries />
    <ImportEntryDialog {idb} {surveyRecord} bind:exportedEntries />
  {/if}
</div>

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Submitted Entries</h2>
  {#if submittedEntries.length}
    <ExportEntriesDialog {surveyRecord} entries={submittedEntries} />
    <BulkSetEntryStatusDialog
      {idb}
      {surveyRecord}
      from="submitted"
      to="exported"
      onset={() => {
        exportedEntries = [...exportedEntries, ...submittedEntries];
        submittedEntries = [];
      }}
    />
    {#each submittedEntries.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as entry (entry.id)}
      <Anchor route="entry/{entry.id}">
        <Icon name="arrow-right" />
        <div class="flex flex-col">
          <span><small>Team</small> {entry.team}</span>
          {#if entry.type == "match"}
            <span><small>Match</small> {entry.match}</span>
            {#if entry.absent}
              <strong><small>Absent</small> {entry.absent}</strong>
            {/if}
          {/if}
        </div>
      </Anchor>
    {/each}
  {:else}
    No entries.
  {/if}
</div>

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Exported Entries</h2>
  {#if exportedEntries.length}
    <BulkSetEntryStatusDialog
      {idb}
      {surveyRecord}
      from="exported"
      to="submitted"
      onset={() => {
        submittedEntries = [...submittedEntries, ...exportedEntries];
        exportedEntries = [];
      }}
    />
    {#each exportedEntries.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as entry (entry.id)}
      <Anchor route="entry/{entry.id}">
        <Icon name="arrow-right" />
        <div class="flex flex-col">
          <span><small>Team</small> {entry.team}</span>
          {#if entry.type == "match"}
            <span><small>Match</small> {entry.match}</span>
            {#if entry.absent}
              <strong><small>Absent</small> {entry.absent}</strong>
            {/if}
          {/if}
        </div>
      </Anchor>
    {/each}
  {:else}
    No entries.
  {/if}
</div>
