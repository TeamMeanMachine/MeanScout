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
  <div class="flex grow items-center gap-3">
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

    <span class="font-bold">Entry</span>
  </div>

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
    <div class="col-span-full flex flex-col">
      <span class="text-sm">{field.name}</span>
      <span class="font-bold">"{value}"</span>
    </div>
  {:else}
    <div class="text-sm">{field.name}</div>
    <div class="font-bold">{value}</div>
  {/if}
{/snippet}

<div class="grid max-h-[500px] grid-cols-[min-content_auto] items-center gap-x-6 gap-y-3 overflow-auto">
  {#if entryRecord.type == "match"}
    <div class="text-sm">Match</div>
    <div class="font-bold">{entryRecord.match}</div>
  {/if}

  <div class="text-sm">Team</div>
  <div class="font-bold">
    {entryRecord.team}
    {#if teamName}
      <div class="text-xs font-light">{teamName}</div>
    {/if}
  </div>

  {#if entryRecord.scout}
    <div class="text-sm">Scout</div>
    <div class="font-bold">
      {entryRecord.scout}
    </div>

    {#if entryRecord.type == "match" && entryRecord.prediction}
      <div class="text-sm">Prediction</div>
      <div>
        <span class="font-bold capitalize text-{entryRecord.prediction}">{entryRecord.prediction} wins</span>
        {#if entryRecord.predictionReason}
          <div class="text-xs font-light">"{entryRecord.predictionReason}"</div>
        {/if}
      </div>
    {/if}
  {/if}

  {#if entryRecord.type == "match" && entryRecord.absent}
    <div class="text-sm">Absent</div>
    <div class="font-bold">{entryRecord.absent}</div>
  {/if}

  {#if surveyRecord.type == "match" && surveyRecord.tbaEventKey && entryRecord.type == "match" && surveyRecord.tbaMetrics?.length}
    <div class="sticky -top-3 col-span-full bg-neutral-900 pt-3 font-bold">TBA</div>

    {#if entryRecord.tbaMetrics?.length}
      {#each entryRecord.tbaMetrics as tbaMetric}
        <div class="text-sm">{tbaMetric.name}</div>
        <div class="font-bold">{tbaMetric.value}</div>
      {/each}
    {:else}
      <div class="col-span-full">No data pulled</div>
    {/if}
  {/if}

  {#if entryRecord.type != "match" || !entryRecord.absent}
    {#each fieldsWithDetails.topLevel as fieldDetails}
      {#if fieldDetails.type == "group"}
        {@const nestedFields = fieldDetails.field.fieldIds
          .map((id) => fieldsWithDetails.nested.find((f) => f.field.id == id))
          .filter((f) => f !== undefined)}

        <div class="sticky -top-3 col-span-full bg-neutral-900 pt-3 font-bold">{fieldDetails.field.name}</div>
        {#each nestedFields as nestedField}
          {@render fieldRow(nestedField.field, entryRecord.values[nestedField.valueIndex])}
        {/each}
      {:else}
        {@render fieldRow(fieldDetails.field, entryRecord.values[fieldDetails.valueIndex])}
      {/if}
    {/each}
  {/if}
</div>

{#if error}
  <span>{error}</span>
{/if}
