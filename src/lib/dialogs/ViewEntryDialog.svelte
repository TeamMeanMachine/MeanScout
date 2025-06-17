<script lang="ts">
  import type { Value } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { getFieldsWithDetails, type Field, type SingleField } from "$lib/field";
  import { objectStore } from "$lib/idb";
  import type { Survey } from "$lib/survey";
  import { ShareIcon, SquarePenIcon, Trash2Icon } from "@lucide/svelte";
  import DeleteEntryDialog from "./DeleteEntryDialog.svelte";
  import ExportEntriesDialog from "./ExportEntriesDialog.svelte";
  import { goto } from "$app/navigation";

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

  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  let entry = $state(structuredClone($state.snapshot(entryRecord)));
  let error = $state("");

  let teamName = $derived(surveyRecord.teams.find((t) => t.number == entryRecord.team)?.name);

  function editEntry() {
    if (entry.status == "draft") {
      goto(`#/entry/${entry.id}`);
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
      goto(`#/entry/${entry.id}`);
    };
  }
</script>

<div class="flex flex-wrap items-center gap-2">
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
      <ShareIcon class="text-theme size-5" />
    </Button>
  {/if}

  <span class="grow font-bold">Entry</span>

  {#if onchange}
    {#if entry.type != "match" || !entry.absent}
      <Button onclick={editEntry}>
        <SquarePenIcon class="text-theme size-5" />
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
      <Trash2Icon class="text-theme size-5" />
    </Button>
  {/if}
</div>

{#snippet fieldRow(field: SingleField, value: Value)}
  {#if field.type == "text"}
    <tr>
      <td colspan="2" class="p-2 pl-0">
        <div class="flex flex-col">
          <span class="text-sm">{field.name}</span>
          <span class="font-bold">"{value}"</span>
        </div>
      </td>
    </tr>
  {:else}
    <tr>
      <td class="p-2 pl-0 text-sm">{field.name}</td>
      <td class="p-2 font-bold">{value}</td>
    </tr>
  {/if}
{/snippet}

<div class="max-h-[500px] overflow-auto">
  <table class="w-full text-left">
    <tbody>
      {#if entryRecord.type == "match"}
        <tr>
          <td class="p-2 pl-0 text-sm">Match</td>
          <td class="p-2 font-bold">{entryRecord.match}</td>
        </tr>
      {/if}

      <tr>
        <td class="w-0 p-2 pl-0 text-sm">Team</td>
        <td class="p-2 font-bold">
          {entryRecord.team}
          {#if teamName}
            <div class="text-xs font-light">{teamName}</div>
          {/if}
        </td>
      </tr>

      {#if entryRecord.scout}
        <tr>
          <td class="w-0 p-2 pl-0 text-sm">Scout</td>
          <td class="p-2 font-bold">
            {entryRecord.scout}
          </td>
        </tr>
        {#if entryRecord.type == "match" && entryRecord.prediction}
          <tr>
            <td class="w-0 p-2 pl-0 text-sm">Prediction</td>
            <td class="p-2">
              <span class="font-bold capitalize text-{entryRecord.prediction}">{entryRecord.prediction} wins</span>
              {#if entryRecord.predictionReason}
                <div class="text-xs font-light">"{entryRecord.predictionReason}"</div>
              {/if}
            </td>
          </tr>
        {/if}
      {/if}

      {#if entryRecord.type == "match" && entryRecord.absent}
        <tr>
          <td class="p-2 pl-0 text-sm">Absent</td>
          <td class="p-2 font-bold">{entryRecord.absent}</td>
        </tr>
      {/if}

      {#if surveyRecord.type == "match" && surveyRecord.tbaEventKey && entryRecord.type == "match" && surveyRecord.tbaMetrics?.length}
        <tr><td class="p-2"></td></tr>
        <tr><th colspan="2" class="p-2 pl-0">TBA</th></tr>
        {#if entryRecord.tbaMetrics?.length}
          {#each entryRecord.tbaMetrics as tbaMetric}
            <tr>
              <td class="p-2 pl-0 text-sm">{tbaMetric.name}</td>
              <td class="p-2 font-bold">{tbaMetric.value}</td>
            </tr>
          {/each}
        {:else}
          <tr><td class="p-2 pl-0">No data pulled</td></tr>
        {/if}
      {/if}

      <tr><td class="p-2"></td></tr>

      {#if entryRecord.type != "match" || !entryRecord.absent}
        {#each fieldsWithDetails.topLevel as fieldDetails}
          {#if fieldDetails.type == "group"}
            {@const nestedFields = fieldDetails.field.fieldIds
              .map((id) => fieldsWithDetails.nested.find((f) => f.field.id == id))
              .filter((f) => f !== undefined)}

            <tr><th colspan="2" class="p-2 pl-0">{fieldDetails.field.name}</th></tr>
            {#each nestedFields as nestedField}
              {@render fieldRow(nestedField.field, entryRecord.values[nestedField.valueIndex])}
            {/each}
            <tr><td class="p-2"></td></tr>
          {:else}
            {@render fieldRow(fieldDetails.field, entryRecord.values[fieldDetails.valueIndex])}
          {/if}
        {/each}
      {/if}
    </tbody>
  </table>
</div>

{#if error}
  <span>{error}</span>
{/if}
