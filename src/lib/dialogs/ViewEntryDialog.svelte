<script lang="ts">
  import type { Value } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { getDetailedNestedFields, type Field, type SingleField } from "$lib/field";
  import { objectStore } from "$lib/idb";
  import type { Survey } from "$lib/survey";
  import DeleteEntryDialog from "./DeleteEntryDialog.svelte";
  import ExportEntriesDialog from "./ExportEntriesDialog.svelte";

  let {
    surveyRecord,
    fieldRecords,
    entryRecord,
    onchange,
  }: {
    surveyRecord: IDBRecord<Survey>;
    fieldRecords: IDBRecord<Field>[];
    entryRecord: IDBRecord<Entry>;
    onchange?: () => void;
  } = $props();

  const { detailedFields, detailedInnerFields } = getDetailedNestedFields(surveyRecord.fieldIds, fieldRecords);

  let entry = $state(structuredClone($state.snapshot(entryRecord)));
  let error = $state("");

  let teamName = $derived(surveyRecord.teams.find((t) => t.number == entryRecord.team)?.name);

  function editEntry() {
    if (entry.status == "draft") {
      location.hash = `/entry/${entry.id}`;
      return;
    }

    entry.status = "draft";
    entry.modified = new Date();

    const editRequest = objectStore("entries", "readwrite").put($state.snapshot(entry));

    editRequest.onerror = () => {
      error = `Could not edit entry: ${editRequest.error?.message}`;
    };

    editRequest.onsuccess = () => {
      objectStore("surveys", "readwrite").put({ ...$state.snapshot(surveyRecord), modified: new Date() });
      location.hash = `/entry/${entry.id}`;
    };
  }
</script>

{#snippet fieldRow(field: SingleField, value: Value)}
  {#if field.type == "text"}
    <tr>
      <td colspan="2" class="p-2">
        <div class="flex flex-col">
          <small>{field.name}</small>
          <strong>"{value}"</strong>
        </div>
      </td>
    </tr>
  {:else}
    <tr>
      <td class="p-2 text-sm">{field.name}</td>
      <td class="p-2 font-bold">{value}</td>
    </tr>
  {/if}
{/snippet}

<div class="flex max-h-[500px] flex-col gap-2 overflow-auto">
  <table class="w-full text-left">
    <tbody>
      <tr><th colspan="2" class="p-2">Entry</th></tr>
      {#if entryRecord.type == "match"}
        <tr>
          <td class="p-2 text-sm">Match</td>
          <td class="p-2 font-bold">{entryRecord.match}</td>
        </tr>
      {/if}
      <tr>
        <td class="w-0 p-2 text-sm">Team</td>
        <td class="p-2 font-bold">
          {entryRecord.team}
          {#if teamName}
            <div><small class="font-light">{teamName}</small></div>
          {/if}
        </td>
      </tr>
      {#if entryRecord.scout}
        <tr>
          <td class="w-0 p-2 text-sm">Scout</td>
          <td class="p-2 font-bold">
            {entryRecord.scout}
          </td>
        </tr>
        {#if entryRecord.type == "match" && entryRecord.prediction}
          <tr>
            <td class="w-0 p-2 text-sm">Prediction</td>
            <td class="p-2">
              <span class="font-bold capitalize text-{entryRecord.prediction}">{entryRecord.prediction} wins</span>
              {#if entryRecord.predictionReason}
                <div><small class="font-light">"{entryRecord.predictionReason}"</small></div>
              {/if}
            </td>
          </tr>
        {/if}
      {/if}
      {#if entryRecord.type == "match" && entryRecord.absent}
        <tr>
          <td class="p-2 text-sm">Absent</td>
          <td class="p-2 font-bold">{entryRecord.absent}</td>
        </tr>
      {/if}
      <tr><td class="p-2"></td></tr>
      {#if entryRecord.type != "match" || !entryRecord.absent}
        {#each surveyRecord.fieldIds as fieldId}
          {@const fieldDetails = detailedFields.get(fieldId)}
          {#if fieldDetails?.type == "group"}
            <tr><th colspan="2" class="p-2">{fieldDetails.field.name}</th></tr>
            {#each fieldDetails.field.fieldIds as innerFieldId}
              {@const innerFieldDetails = detailedInnerFields.get(innerFieldId)}
              {#if innerFieldDetails}
                {@render fieldRow(innerFieldDetails.field, entryRecord.values[innerFieldDetails.valueIndex])}
              {/if}
            {/each}
            <tr><td class="p-2"></td></tr>
          {:else if fieldDetails}
            {@render fieldRow(fieldDetails.field, entryRecord.values[fieldDetails.valueIndex])}
          {/if}
        {/each}
      {/if}
    </tbody>
  </table>
</div>

{#if onchange}
  <Button
    onclick={() =>
      openDialog(ExportEntriesDialog, {
        surveyRecord,
        entries: [entry],
        onexport(newEntry) {
          if (newEntry) {
            entry = newEntry;
            onchange();
          }
        },
      })}
  >
    <Icon name="share-from-square" />
    {#if entry.status == "exported"}
      Re-export
    {:else}
      Export
    {/if}
  </Button>

  {#if entry.type != "match" || !entry.absent}
    <Button onclick={editEntry}>
      <Icon name="pen" />
      Convert to draft and edit
    </Button>
  {/if}

  <Button
    onclick={() =>
      openDialog(DeleteEntryDialog, {
        surveyRecord,
        entryRecord,
        ondelete: () => {
          onchange();
          closeDialog();
        },
      })}
  >
    <Icon name="trash" />
    Delete
  </Button>
{/if}

{#if error}
  <span>{error}</span>
{/if}
