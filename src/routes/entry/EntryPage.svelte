<script lang="ts">
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import type { Entry } from "$lib/entry";
  import { flattenFields } from "$lib/field";
  import type { Survey } from "$lib/survey";
  import DeleteEntryDialog from "./DeleteEntryDialog.svelte";
  import EditEntryDialog from "./EditEntryDialog.svelte";
  import ExportEntryDialog from "./ExportEntryDialog.svelte";
  import SubmitEntryDialog from "./SubmitEntryDialog.svelte";

  let {
    idb,
    surveyRecord,
    entryRecord,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecord: IDBRecord<Entry>;
  } = $props();

  function countPreviousFields(index: number) {
    return flattenFields(surveyRecord.fields.slice(0, index)).length;
  }

  function onchange() {
    entryRecord.modified = new Date();
    surveyRecord.modified = new Date();
  }
</script>

{#if entryRecord.status == "draft"}
  <Header backLink="survey/{surveyRecord.id}">
    <small>{surveyRecord.name}</small>
    <h1 class="font-bold">Draft</h1>
  </Header>

  <div class="flex flex-col gap-4 p-3">
    <div class="flex flex-col">
      <span><small>Team</small> <strong>{entryRecord.team}</strong></span>
      {#if entryRecord.type == "match"}
        <span><small>Match</small> <strong>{entryRecord.match}</strong></span>
      {/if}
    </div>

    <div class="flex flex-wrap items-end gap-2">
      {#each surveyRecord.fields as field, i (field)}
        {@const previousFields = countPreviousFields(i)}
        {#if field.type == "group"}
          <div class="flex w-full flex-col gap-1">
            <h2 class="font-bold">{field.name}</h2>
            <div class="mb-4 flex flex-wrap items-end gap-2">
              {#each field.fields as innerField, innerFieldIndex (innerField)}
                <FieldValueEditor
                  field={innerField}
                  bind:value={entryRecord.values[previousFields + innerFieldIndex]}
                  {onchange}
                />
              {/each}
            </div>
          </div>
        {:else}
          <FieldValueEditor {field} bind:value={entryRecord.values[previousFields]} {onchange} />
        {/if}
      {/each}
    </div>
  </div>
{:else}
  <Header backLink="survey/{surveyRecord.id}/entries">
    <small>{surveyRecord.name}</small>
    <h1 class="font-bold">Entry</h1>
  </Header>

  <div class="p-3">
    <ExportEntryDialog {surveyRecord} entry={entryRecord} />
  </div>

  <div class="flex flex-col gap-2 p-3">
    <span><small>Team</small> <strong>{entryRecord.team}</strong></span>
    {#if entryRecord.type == "match"}
      <span><small>Match</small> <strong>{entryRecord.match}</strong></span>
      <span><small>Absent</small> <strong>{entryRecord.absent}</strong></span>
    {/if}

    {#if entryRecord.type != "match" || !entryRecord.absent}
      {#each surveyRecord.fields as field, i (field)}
        {@const previousFields = countPreviousFields(i)}
        {#if field.type == "group"}
          <h2 class="mt-2 font-bold">{field.name}</h2>
          {#each field.fields as innerField, innerFieldIndex (innerField)}
            <span><small>{innerField.name}</small> {entryRecord.values[previousFields + innerFieldIndex]}</span>
          {/each}
        {:else}
          <span><small>{field.name}</small> {entryRecord.values[previousFields]}</span>
        {/if}
      {/each}
    {/if}
  </div>
{/if}

<footer class="flex flex-wrap gap-2 p-3">
  {#if entryRecord.status == "draft"}
    <SubmitEntryDialog {idb} bind:surveyRecord {entryRecord} />
  {:else}
    <EditEntryDialog {idb} bind:surveyRecord {entryRecord} />
  {/if}

  <DeleteEntryDialog {idb} bind:surveyRecord {entryRecord} />
</footer>
