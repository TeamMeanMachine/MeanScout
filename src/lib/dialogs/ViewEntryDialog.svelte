<script lang="ts">
  import { ShareIcon, SquarePenIcon, Trash2Icon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { getTeamName, type Value } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { getFieldsWithDetails, type Field, type SingleField } from "$lib/field";
  import { idb } from "$lib/idb";
  import type { Survey } from "$lib/survey";
  import BulkExportDialog from "./BulkExportDialog.svelte";
  import DeleteEntryDialog from "./DeleteEntryDialog.svelte";

  let {
    compRecord,
    surveyRecord,
    fieldRecords,
    entryRecord,
    onchange,
  }: {
    compRecord: Comp;
    surveyRecord: Survey;
    fieldRecords: Field[];
    entryRecord: Entry;
    onchange?: () => void;
  } = $props();

  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  let entry = $state(structuredClone($state.snapshot(entryRecord)));
  let error = $state("");

  let teamName = $derived(getTeamName(entryRecord.team, compRecord.teams));

  function editEntry() {
    if (entry.status == "draft") {
      sessionStorage.removeItem(`${surveyRecord.id}-new-entry-state`);
      sessionStorage.removeItem("new-entry");
      goto(`#/entry/${entry.id}`);
      return;
    }

    entry.status = "draft";
    entry.modified = new Date();

    const editRequest = idb.put("entries", $state.snapshot(entry));

    editRequest.onerror = () => {
      error = `Could not edit entry: ${editRequest.error?.message}`;
    };

    editRequest.onsuccess = () => {
      idb.put("surveys", { ...$state.snapshot(surveyRecord), modified: new Date() });
      sessionStorage.removeItem(`${surveyRecord.id}-new-entry-state`);
      sessionStorage.removeItem("new-entry");
      goto(`#/entry/${entry.id}`);
    };
  }
</script>

<div class="flex items-center gap-2">
  {#if onchange}
    <Button
      onclick={() => {
        openDialog(BulkExportDialog, {
          entries: [entry],
          onexport() {
            idb.put("surveys", { ...$state.snapshot(surveyRecord), modified: new Date() });

            if (entry.status == "exported") {
              onchange();
              return;
            }

            idb.put("entries", {
              ...$state.snapshot(entry),
              status: "exported",
              modified: new Date(),
            }).onsuccess = onchange;
          },
        });
      }}
    >
      <ShareIcon class="size-5 text-theme" />
    </Button>
  {/if}

  <div class="flex grow flex-wrap items-center justify-between gap-2">
    <div class="flex flex-col">
      <h2 class="font-bold">Entry</h2>
      <span class="text-xs font-light">{surveyRecord.name}</span>
    </div>
    <span class="text-xs font-light">{entry.id}</span>
  </div>

  {#if onchange}
    {#if entry.type != "match" || !entry.absent}
      <Button onclick={editEntry}>
        <SquarePenIcon class="size-5 text-theme" />
      </Button>
    {/if}

    <Button
      onclick={() =>
        openDialog(DeleteEntryDialog, {
          surveyRecord,
          entryRecord,
          ondelete: () => {
            idb.put("surveys", { ...$state.snapshot(surveyRecord), modified: new Date() });
            onchange();
            closeDialog();
          },
        })}
    >
      <Trash2Icon class="size-5 text-theme" />
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
    <div class="font-bold">
      {#if entryRecord.matchLevel && entryRecord.matchLevel != "qm"}
        {entryRecord.matchLevel}{entryRecord.matchSet || 1}-{entryRecord.match}
      {:else}
        {entryRecord.match}
      {/if}
    </div>
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
      <div class="text-sm">Guess</div>
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

  {#if surveyRecord.type == "match" && compRecord.tbaEventKey && entryRecord.type == "match" && surveyRecord.tbaMetrics?.length}
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
