<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { fieldIcons, getDefaultFieldValue } from "$lib/field";
  import type { Survey } from "$lib/survey";
  import UpsertFieldDialog from "./UpsertFieldDialog.svelte";
  import ViewFieldDialog from "./ViewFieldDialog.svelte";

  let {
    surveyRecord,
    entryCount,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryCount: number;
  } = $props();

  const disabled = surveyRecord.expressions.length > 0 || surveyRecord.pickLists.length > 0 || entryCount > 0;

  let preview = $state(disabled);

  let viewFieldDialog = $state<ViewFieldDialog | undefined>();
  let upsertFieldDialog = $state<UpsertFieldDialog | undefined>();
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
    <ViewFieldDialog bind:this={viewFieldDialog} {upsertFieldDialog} bind:surveyRecord />
    <div class="flex flex-col gap-4 p-3">
      {#each surveyRecord.fields as field, fieldIndex (field)}
        {#if field.type == "group"}
          <div class="flex flex-col gap-2">
            <h2 class="font-bold">{field.name}</h2>
            <Button onclick={() => viewFieldDialog?.viewField(fieldIndex)}>
              <Icon name={fieldIcons[field.type]} />
              Group
            </Button>
            {#each field.fields as innerField, innerFieldIndex (innerField)}
              <Button onclick={() => viewFieldDialog?.viewInnerField(fieldIndex, innerFieldIndex)}>
                <Icon name={fieldIcons[innerField.type]} />
                <div class="flex flex-col">
                  {innerField.name}
                  <small class="capitalize">{innerField.type}</small>
                </div>
              </Button>
            {/each}
            <Button onclick={() => upsertFieldDialog?.newInnerField(fieldIndex)}>
              <Icon name="plus" />
              New {field.name} field
            </Button>
          </div>
        {:else}
          <Button onclick={() => viewFieldDialog?.viewField(fieldIndex)}>
            <Icon name={fieldIcons[field.type]} />
            <div class="flex flex-col">
              {field.name}
              <small class="capitalize">{field.type}</small>
            </div>
          </Button>
        {/if}
      {/each}
    </div>
    <UpsertFieldDialog bind:this={upsertFieldDialog} bind:surveyRecord onupdate={() => viewFieldDialog?.refresh()} />
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
    <div class="flex flex-wrap items-end gap-2">
      {#each surveyRecord.fields as field (field)}
        {#if field.type == "group"}
          <div class="flex w-full flex-col gap-1">
            <h2 class="font-bold">{field.name}</h2>
            <div class="mb-4 flex flex-wrap items-end gap-2">
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
