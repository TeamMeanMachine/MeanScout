<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import NewFieldDialog from "$lib/dialogs/NewFieldDialog.svelte";
  import ViewFieldDialog from "$lib/dialogs/ViewFieldDialog.svelte";
  import { fieldIcons, getDefaultFieldValue, getDetailedNestedFields, type Field } from "$lib/field";
  import { transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    fieldRecords,
    entryCount,
  }: {
    surveyRecord: IDBRecord<Survey>;
    fieldRecords: IDBRecord<Field>[];
    entryCount: number;
  } = $props();

  const disabled =
    entryCount > 0 ||
    (surveyRecord.type == "match" && (surveyRecord.expressions.length > 0 || surveyRecord.pickLists.length > 0));

  let preview = $state(disabled);

  let { detailedFields, detailedInnerFields } = $state(getDetailedNestedFields(surveyRecord.fieldIds, fieldRecords));

  function refresh() {
    const refreshTransaction = transaction("fields");
    refreshTransaction.onabort = () => {
      location.reload();
    };

    const fieldsRequest = refreshTransaction.objectStore("fields").index("surveyId").getAll(surveyRecord.id);
    fieldsRequest.onsuccess = () => {
      ({ detailedFields, detailedInnerFields } = getDetailedNestedFields(surveyRecord.fieldIds, fieldsRequest.result));
    };
  }
</script>

{#if !disabled}
  <div class="flex">
    <Button onclick={() => (preview = !preview)}>
      {#if preview}
        <Icon name="square-check" />
      {:else}
        <Icon style="regular" name="square" />
      {/if}
      Preview
    </Button>
  </div>
  {#if !preview}
    <div class="flex flex-col gap-4">
      {#each surveyRecord.fieldIds as fieldId}
        {@const detailedField = detailedFields.get(fieldId)}

        {#if detailedField?.type == "group"}
          <div class="flex flex-col gap-2">
            <h2 class="font-bold">{detailedField.field.name}</h2>
            <Button
              onclick={() => {
                openDialog(ViewFieldDialog, {
                  surveyRecord,
                  detailedFields,
                  detailedInnerFields,
                  field: structuredClone($state.snapshot(detailedField.field)),
                  onupdate: refresh,
                });
              }}
            >
              <Icon name={fieldIcons["group"]} />
              Group
            </Button>

            {#each detailedField.field.fieldIds as innerFieldId}
              {@const detailedInnerField = detailedInnerFields.get(innerFieldId)}

              {#if detailedInnerField}
                <Button
                  onclick={() => {
                    openDialog(ViewFieldDialog, {
                      surveyRecord,
                      detailedFields,
                      detailedInnerFields,
                      field: structuredClone($state.snapshot(detailedInnerField.field)),
                      parentField: structuredClone($state.snapshot(detailedField.field)),
                      onupdate: refresh,
                    });
                  }}
                >
                  <Icon name={fieldIcons[detailedInnerField.field.type]} />
                  <div class="flex flex-col">
                    {detailedInnerField.field.name}
                    <small class="capitalize">{detailedInnerField.field.type}</small>
                  </div>
                </Button>
              {/if}
            {/each}

            <Button
              onclick={() => {
                openDialog(NewFieldDialog, {
                  surveyRecord,
                  parentField: structuredClone($state.snapshot(detailedField.field)),
                  onupdate: refresh,
                });
              }}
            >
              <Icon name="plus" />
              New {detailedField.field.name} field
            </Button>
          </div>
        {:else if detailedField}
          <Button
            onclick={() => {
              openDialog(ViewFieldDialog, {
                surveyRecord,
                detailedFields,
                detailedInnerFields,
                field: structuredClone($state.snapshot(detailedField.field)),
                onupdate: refresh,
              });
            }}
          >
            <Icon name={fieldIcons[detailedField.field.type]} />
            <div class="flex flex-col">
              {detailedField.field.name}
              <small class="capitalize">{detailedField.field.type}</small>
            </div>
          </Button>
        {/if}
      {/each}
    </div>
    <div class="flex flex-wrap gap-2">
      <Button
        {disabled}
        onclick={() => {
          openDialog(NewFieldDialog, { surveyRecord, type: "group", onupdate: refresh });
        }}
      >
        <Icon name="plus" />
        New group
      </Button>
      <Button
        {disabled}
        onclick={() => {
          openDialog(NewFieldDialog, { surveyRecord, onupdate: refresh });
        }}
      >
        <Icon name="plus" />
        New field
      </Button>
    </div>
  {/if}
{/if}

{#if preview}
  <div class="flex flex-col gap-4">
    <h2 class="font-bold">Preview</h2>
    <div class="flex flex-col">
      <span><small>Team</small> <strong>####</strong></span>
      {#if surveyRecord.type == "match"}
        <span><small>Match</small> <strong>##</strong></span>
      {/if}
    </div>
    <div class="flex flex-col flex-wrap gap-3">
      {#each surveyRecord.fieldIds as fieldId}
        {@const detailedField = detailedFields.get(fieldId)}

        {#if detailedField?.type == "group"}
          <div class="flex w-full flex-col gap-1">
            <h2 class="font-bold">{detailedField.field.name}</h2>

            <div class="mb-4 flex flex-col flex-wrap gap-3">
              {#each detailedField.field.fieldIds as innerFieldId}
                {@const detailedInnerField = detailedInnerFields.get(innerFieldId)}

                {#if detailedInnerField}
                  <FieldValueEditor
                    field={detailedInnerField.field}
                    value={getDefaultFieldValue(detailedInnerField.field)}
                  />
                {/if}
              {/each}
            </div>
          </div>
        {:else if detailedField}
          <FieldValueEditor field={detailedField.field} value={getDefaultFieldValue(detailedField.field)} />
        {/if}
      {/each}
    </div>
  </div>
{/if}
