<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import NewFieldDialog from "$lib/dialogs/NewFieldDialog.svelte";
  import ViewFieldDialog from "$lib/dialogs/ViewFieldDialog.svelte";
  import { fieldIcons, getDefaultFieldValue } from "$lib/field";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryCount,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryCount: number;
  } = $props();

  const disabled =
    entryCount > 0 ||
    (surveyRecord.type == "match" && (surveyRecord.expressions.length > 0 || surveyRecord.pickLists.length > 0));

  let preview = $state(disabled);
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Fields</h1>
</Header>

{#if !disabled}
  <div class="flex p-3">
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
    <div class="flex flex-col gap-4 p-3">
      {#each surveyRecord.fields as field, index (field)}
        {#if field.type == "group"}
          <div class="flex flex-col gap-2">
            <h2 class="font-bold">{field.name}</h2>
            <Button
              onclick={() => {
                openDialog(ViewFieldDialog, { surveyRecord, action: { type: "field", index } });
              }}
            >
              <Icon name={fieldIcons[field.type]} />
              Group
            </Button>
            {#each field.fields as innerField, innerIndex (innerField)}
              <Button
                onclick={() => {
                  openDialog(ViewFieldDialog, { surveyRecord, action: { type: "inner-field", index, innerIndex } });
                }}
              >
                <Icon name={fieldIcons[innerField.type]} />
                <div class="flex flex-col">
                  {innerField.name}
                  <small class="capitalize">{innerField.type}</small>
                </div>
              </Button>
            {/each}
            <Button
              onclick={() => {
                openDialog(NewFieldDialog, { surveyRecord, action: { type: "inner-field", index } });
              }}
            >
              <Icon name="plus" />
              New {field.name} field
            </Button>
          </div>
        {:else}
          <Button
            onclick={() => {
              openDialog(ViewFieldDialog, { surveyRecord, action: { type: "field", index } });
            }}
          >
            <Icon name={fieldIcons[field.type]} />
            <div class="flex flex-col">
              {field.name}
              <small class="capitalize">{field.type}</small>
            </div>
          </Button>
        {/if}
      {/each}
    </div>
    <div class="flex flex-wrap gap-2 p-3">
      <Button
        {disabled}
        onclick={() => {
          openDialog(NewFieldDialog, { surveyRecord, action: { type: "group" } });
        }}
      >
        <Icon name="plus" />
        New group
      </Button>
      <Button
        {disabled}
        onclick={() => {
          openDialog(NewFieldDialog, { surveyRecord, action: { type: "field" } });
        }}
      >
        <Icon name="plus" />
        New field
      </Button>
    </div>
  {/if}
{/if}

{#if preview}
  <div class="flex flex-col gap-4 p-3">
    <h2 class="font-bold">Preview</h2>
    <div class="flex flex-col">
      <span><small>Team</small> <strong>####</strong></span>
      {#if surveyRecord.type == "match"}
        <span><small>Match</small> <strong>##</strong></span>
      {/if}
    </div>
    <div class="flex flex-col flex-wrap gap-3">
      {#each surveyRecord.fields as field (field)}
        {#if field.type == "group"}
          <div class="flex w-full flex-col gap-1">
            <h2 class="font-bold">{field.name}</h2>
            <div class="mb-4 flex flex-col flex-wrap gap-3">
              {#each field.fields as innerField (innerField)}
                <FieldValueEditor field={innerField} value={getDefaultFieldValue(innerField)} />
              {/each}
            </div>
          </div>
        {:else}
          <FieldValueEditor {field} value={getDefaultFieldValue(field)} />
        {/if}
      {/each}
    </div>
  </div>
{/if}
