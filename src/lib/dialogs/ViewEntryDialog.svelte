<script lang="ts">
  import type { Value } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry } from "$lib/entry";
  import { countPreviousFields, type SingleField } from "$lib/field";
  import type { Survey } from "$lib/survey";
  import DeleteEntryDialog from "./DeleteEntryDialog.svelte";
  import ExportEntryDialog from "./ExportEntryDialog.svelte";

  let {
    idb,
    surveyRecord = $bindable(),
    onchange,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    onchange?: (() => void) | undefined;
  } = $props();

  let dialog: ReturnType<typeof Dialog>;

  let entryRecord = $state<IDBRecord<Entry> | undefined>();
  let error = $state("");

  export function open(entry: IDBRecord<Entry>) {
    entryRecord = structuredClone($state.snapshot(entry));
    dialog?.open();
  }

  function editEntry() {
    if (!entryRecord) return;
    if (entryRecord.status == "draft") {
      location.hash = `/entry/${entryRecord.id}`;
      return;
    }

    entryRecord.status = "draft";
    entryRecord.modified = new Date();

    const editRequest = idb
      .transaction("entries", "readwrite")
      .objectStore("entries")
      .put($state.snapshot(entryRecord));

    editRequest.onerror = () => {
      error = `Could not edit entry: ${editRequest.error?.message}`;
    };

    editRequest.onsuccess = () => {
      if (!entryRecord) return;
      surveyRecord.modified = new Date();
      location.hash = `/entry/${entryRecord.id}`;
    };
  }

  function onclose() {
    entryRecord = undefined;
    error = "";
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

<Dialog bind:this={dialog} {onclose}>
  {#if entryRecord}
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
    <ExportEntryDialog {idb} {surveyRecord} {entryRecord} {onchange} />
    {#if entryRecord.type != "match" || !entryRecord.absent}
      <Button onclick={editEntry}>
        <Icon name="pen" />
        Convert to draft and edit
      </Button>
    {/if}
    <DeleteEntryDialog
      {idb}
      bind:surveyRecord
      {entryRecord}
      ondelete={() => {
        onchange?.();
        dialog.close();
      }}
    />
  {/if}

  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
