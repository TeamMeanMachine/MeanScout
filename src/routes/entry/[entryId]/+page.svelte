<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteEntryDialog from "$lib/dialogs/DeleteEntryDialog.svelte";
  import SubmitEntryDialog from "$lib/dialogs/SubmitEntryDialog.svelte";
  import { objectStore } from "$lib/idb";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let entry = $state(structuredClone($state.snapshot(data.entryRecord)));

  function onchange() {
    data = {
      ...data,
      entryRecord: { ...entry, modified: new Date() },
      surveyRecord: { ...data.surveyRecord, modified: new Date() },
    } as PageData;
    objectStore("entries", "readwrite").put($state.snapshot(data.entryRecord));
    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
  }
</script>

<Header
  title="Draft - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Draft" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-6" style="view-transition-name:draft-{data.entryRecord.id}">
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap gap-x-6 gap-y-3">
      <div class="flex flex-col">
        {#if data.surveyType == "match"}
          <span><small>Match</small> <strong>{data.entryRecord.match}</strong></span>
        {/if}
        <span><small>Team</small> <strong>{data.entryRecord.team}</strong></span>
        {#if data.teamName?.length}
          <span><small class="font-light">{data.teamName}</small></span>
        {/if}
      </div>
      {#if data.entryRecord.scout}
        <div class="flex flex-col">
          <span><small>Scout</small> <strong>{data.entryRecord.scout}</strong></span>
          {#if data.surveyType == "match" && data.entryRecord.prediction}
            <span>
              <small>Prediction</small>
              <strong class="capitalize text-{data.entryRecord.prediction}">
                {data.entryRecord.prediction} wins
              </strong>
            </span>
            {#if data.entryRecord.predictionReason}
              <span><small class="font-light">"{data.entryRecord.predictionReason}"</small></span>
            {/if}
          {/if}
        </div>
      {/if}
    </div>

    <div class="flex flex-col flex-wrap gap-3">
      {#each data.surveyRecord.fieldIds as fieldId}
        {@const fieldDetails = data.detailedFields.get(fieldId)}

        {#if fieldDetails?.type == "group"}
          <div class="flex w-full flex-col gap-1">
            <h2 class="font-bold">{fieldDetails.field.name}</h2>

            <div class="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
              {#each fieldDetails.field.fieldIds as innerFieldId}
                {@const innerFieldDetails = data.detailedInnerFields.get(innerFieldId)}

                {#if innerFieldDetails}
                  <FieldValueEditor
                    field={innerFieldDetails.field}
                    bind:value={entry.values[innerFieldDetails.valueIndex]}
                    {onchange}
                  />
                {/if}
              {/each}
            </div>
          </div>
        {:else if fieldDetails}
          <FieldValueEditor field={fieldDetails.field} bind:value={entry.values[fieldDetails.valueIndex]} {onchange} />
        {/if}
      {/each}
    </div>
  </div>

  <div class="flex flex-wrap gap-2">
    <Button
      onclick={() =>
        openDialog(SubmitEntryDialog, {
          fields: data.fields,
          entryRecord: data.entryRecord,
          onexport: () => {
            objectStore("surveys", "readwrite").put({ ...$state.snapshot(data.surveyRecord), modified: new Date() });
            location.hash = `/survey/${data.surveyRecord.id}`;
          },
        })}
    >
      <Icon name="floppy-disk" />
      Submit
    </Button>

    <Button
      onclick={() =>
        openDialog(DeleteEntryDialog, {
          entryRecord: data.entryRecord,
          ondelete: () => {
            objectStore("surveys", "readwrite").put({ ...$state.snapshot(data.surveyRecord), modified: new Date() });
            location.hash = `/survey/${data.surveyRecord.id}`;
          },
        })}
    >
      <Icon name="trash" />
      Delete
    </Button>
  </div>
</div>
