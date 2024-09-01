<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FieldValueEditor from "$lib/components/FieldValueEditor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { getDefaultFieldValue } from "$lib/field";
  import type { Survey } from "$lib/survey";
  import FieldEditor from "./FieldEditor.svelte";

  let {
    surveyRecord,
    entryCount,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryCount: number;
  } = $props();

  const disabled = surveyRecord.expressions.length > 0 || surveyRecord.pickLists.length > 0 || entryCount > 0;

  let preview = $state(false);

  function newField() {
    surveyRecord.modified = new Date();
    surveyRecord.fields = [...surveyRecord.fields, { name: "", type: "toggle" }];
  }

  function togglePreview() {
    preview = !preview;
  }

  function onchange() {
    surveyRecord.modified = new Date();
  }
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Fields</h1>
</Header>

<div class="flex flex-col gap-4 p-3">
  {#if preview}
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
  {:else}
    {#if disabled}
      <span>
        Cannot modify fields with
        {#if entryCount > 0}
          entries
        {:else}
          pick lists/expressions
        {/if}
        present!
      </span>
    {/if}
    {#each surveyRecord.fields as field, fieldIndex (field)}
      <FieldEditor
        bind:fields={surveyRecord.fields}
        bind:field={surveyRecord.fields[fieldIndex]}
        {fieldIndex}
        {disabled}
        {onchange}
      />
    {/each}
  {/if}
</div>

<footer class="flex flex-wrap gap-2 p-3">
  <Button {disabled} onclick={newField}>
    <Icon name="plus" />
    New field
  </Button>
  <Button onclick={togglePreview}>
    {#if preview}
      <Icon name="square-check" />
    {:else}
      <Icon style="regular" name="square" />
    {/if}
    Preview
  </Button>
</footer>
