<script lang="ts">
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import DeleteEntryDialog from "$lib/dialogs/DeleteEntryDialog.svelte";
  import SubmitEntryDialog from "$lib/dialogs/SubmitEntryDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { countPreviousFields } from "$lib/field";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecord,
    entryRecord,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecord: IDBRecord<Entry>;
  } = $props();

  function onchange() {
    entryRecord.modified = new Date();
    surveyRecord.modified = new Date();
  }
</script>

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

  <div class="flex flex-col flex-wrap gap-3">
    {#each surveyRecord.fields as field, i (field)}
      {@const previousFields = countPreviousFields(i, surveyRecord.fields)}
      {#if field.type == "group"}
        <div class="flex w-full flex-col gap-1">
          <h2 class="font-bold">{field.name}</h2>
          <div class="mb-4 flex flex-col flex-wrap gap-3">
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

<footer class="flex flex-wrap gap-2 p-3">
  <SubmitEntryDialog {idb} bind:surveyRecord {entryRecord} />
  <DeleteEntryDialog
    {idb}
    bind:surveyRecord
    {entryRecord}
    ondelete={() => {
      if (entryRecord.status == "draft") {
        location.hash = `/survey/${surveyRecord.id}`;
      } else {
        location.hash = `/survey/${surveyRecord.id}/entries`;
      }
    }}
  />
</footer>
