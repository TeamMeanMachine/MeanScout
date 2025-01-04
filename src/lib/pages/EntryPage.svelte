<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteEntryDialog from "$lib/dialogs/DeleteEntryDialog.svelte";
  import SubmitEntryDialog from "$lib/dialogs/SubmitEntryDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { getDetailedNestedFields, getDetailedSingleFields, type Field } from "$lib/field";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    fieldRecords,
    entryRecord,
  }: {
    surveyRecord: IDBRecord<Survey>;
    fieldRecords: IDBRecord<Field>[];
    entryRecord: IDBRecord<Entry>;
  } = $props();

  const fields = getDetailedSingleFields(surveyRecord, fieldRecords);

  const { detailedFields, detailedInnerFields } = getDetailedNestedFields(surveyRecord.fieldIds, fieldRecords);

  function onchange() {
    entryRecord.modified = new Date();
    surveyRecord.modified = new Date();
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col">
    <span><small>Team</small> <strong>{entryRecord.team}</strong></span>
    {#if entryRecord.type == "match"}
      <span><small>Match</small> <strong>{entryRecord.match}</strong></span>
    {/if}
  </div>

  <div class="flex flex-col flex-wrap gap-3">
    {#each surveyRecord.fieldIds as fieldId}
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
                  bind:value={entryRecord.values[innerFieldDetails.valueIndex]}
                  {onchange}
                />
              {/if}
            {/each}
          </div>
        </div>
      {:else if fieldDetails}
        <FieldValueEditor
          field={fieldDetails.field}
          bind:value={entryRecord.values[fieldDetails.valueIndex]}
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
        surveyRecord,
        fields,
        entryRecord,
        onexport: () => {
          location.hash = `/survey/${surveyRecord.id}`;
        },
      })}
  >
    <Icon name="floppy-disk" />
    Submit
  </Button>

  <Button
    onclick={() =>
      openDialog(DeleteEntryDialog, {
        surveyRecord,
        entryRecord,
        ondelete: () => {
          if (entryRecord.status == "draft") {
            location.hash = `/survey/${surveyRecord.id}`;
          } else {
            location.hash = `/survey/${surveyRecord.id}/entries`;
          }
        },
      })}
  >
    <Icon name="trash" />
    Delete
  </Button>
</div>
