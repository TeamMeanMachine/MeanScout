<script lang="ts">
  import type { Value } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { countPreviousFields, type SingleField } from "$lib/field";
  import type { Survey } from "$lib/survey";
  import DeleteEntryDialog from "./DeleteEntryDialog.svelte";
  import ExportEntryDialog from "./ExportEntryDialog.svelte";

  let {
    idb,
    surveyRecord,
    entryRecord,
    onchange,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecord: IDBRecord<Entry>;
    onchange?: () => void;
  } = $props();

  let entry = $state(structuredClone($state.snapshot(entryRecord)));
  let error = $state("");

  function editEntry() {
    if (entry.status == "draft") {
      location.hash = `/entry/${entry.id}`;
      return;
    }

    entry.status = "draft";
    entry.modified = new Date();

    const editRequest = idb.transaction("entries", "readwrite").objectStore("entries").put($state.snapshot(entry));

    editRequest.onerror = () => {
      error = `Could not edit entry: ${editRequest.error?.message}`;
    };

    editRequest.onsuccess = () => {
      surveyRecord.modified = new Date();
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
      <tr>
        <td class="w-0 p-2 text-sm">Team</td>
        <td class="p-2 font-bold">{entryRecord.team}</td>
      </tr>
      {#if entryRecord.type == "match"}
        <tr>
          <td class="p-2 text-sm">Match</td>
          <td class="p-2 font-bold">{entryRecord.match}</td>
        </tr>
        <tr>
          <td class="p-2 text-sm">Absent</td>
          <td class="p-2 font-bold">{entryRecord.absent}</td>
        </tr>
      {/if}
      <tr><td class="p-2"></td></tr>
      {#if entryRecord.type != "match" || !entryRecord.absent}
        {#each surveyRecord.fields as field, i (field)}
          {@const previousFields = countPreviousFields(i, surveyRecord.fields)}
          {#if field.type == "group"}
            <tr><th colspan="2" class="p-2">{field.name}</th></tr>
            {#each field.fields as innerField, innerFieldIndex (innerField)}
              {@render fieldRow(innerField, entryRecord.values[previousFields + innerFieldIndex])}
            {/each}
            <tr><td class="p-2"></td></tr>
          {:else}
            {@render fieldRow(field, entryRecord.values[previousFields])}
          {/if}
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<Button
  onclick={() =>
    openDialog(ExportEntryDialog, {
      idb,
      surveyRecord,
      entryRecord: entry,
      onexport(newEntry) {
        entry = newEntry;
        onchange?.();
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
      idb,
      surveyRecord,
      entryRecord,
      ondelete: () => {
        onchange?.();
        closeDialog();
      },
    })}
>
  <Icon name="trash" />
  Delete
</Button>

{#if error}
  <span>{error}</span>
{/if}
