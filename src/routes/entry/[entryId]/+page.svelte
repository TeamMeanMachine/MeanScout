<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteEntryDialog from "$lib/dialogs/DeleteEntryDialog.svelte";
  import SubmitEntryDialog from "$lib/dialogs/SubmitEntryDialog.svelte";
  import { getDetailedNestedFields, getDetailedSingleFields } from "$lib/field";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);

  const { detailedFields, detailedInnerFields } = getDetailedNestedFields(
    data.surveyRecord.fieldIds,
    data.fieldRecords,
  );

  function onchange() {
    data.entryRecord.modified = new Date();
    data.surveyRecord.modified = new Date();
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

<div class="flex flex-col gap-4">
  <div class="flex flex-col">
    <span><small>Team</small> <strong>{data.entryRecord.team}</strong></span>
    {#if data.entryRecord.type == "match"}
      <span><small>Match</small> <strong>{data.entryRecord.match}</strong></span>
    {/if}
  </div>

  <div class="flex flex-col flex-wrap gap-3">
    {#each data.surveyRecord.fieldIds as fieldId}
      {@const fieldDetails = detailedFields.get(fieldId)}

      {#if fieldDetails?.type == "group"}
        <div class="flex w-full flex-col gap-1">
          <h2 class="font-bold">{fieldDetails.field.name}</h2>

          <div class="mb-4 flex flex-col flex-wrap gap-3">
            {#each fieldDetails.field.fieldIds as innerFieldId}
              {@const innerFieldDetails = detailedInnerFields.get(innerFieldId)}

              {#if innerFieldDetails}
                <FieldValueEditor
                  field={innerFieldDetails.field}
                  bind:value={data.entryRecord.values[innerFieldDetails.valueIndex]}
                  {onchange}
                />
              {/if}
            {/each}
          </div>
        </div>
      {:else if fieldDetails}
        <FieldValueEditor
          field={fieldDetails.field}
          bind:value={data.entryRecord.values[fieldDetails.valueIndex]}
          {onchange}
        />
      {/if}
    {/each}
  </div>
</div>

<div class="flex flex-wrap gap-2">
  <Button
    onclick={() =>
      openDialog(SubmitEntryDialog, {
        surveyRecord: data.surveyRecord,
        fields,
        entryRecord: data.entryRecord,
        onexport: () => {
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
        surveyRecord: data.surveyRecord,
        entryRecord: data.entryRecord,
        ondelete: () => {
          if (data.entryRecord.status == "draft") {
            location.hash = `/survey/${data.surveyRecord.id}`;
          } else {
            location.hash = `/survey/${data.surveyRecord.id}/entries`;
          }
        },
      })}
  >
    <Icon name="trash" />
    Delete
  </Button>
</div>
