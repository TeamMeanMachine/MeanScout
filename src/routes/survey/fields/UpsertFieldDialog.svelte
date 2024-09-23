<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { singleFieldTypes, type Field, type GroupField } from "$lib/field";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord = $bindable(),
    disabled = false,
    onupdate,
  }: {
    surveyRecord: IDBRecord<Survey>;
    disabled?: boolean;
    onupdate?: () => void;
  } = $props();

  let dialog: Dialog;

  let parentFieldIndex = $state<number | undefined>();
  let parentField = $state<GroupField>({ name: "", type: "group", fields: [] });

  let fieldIndex = $state<number | undefined>();
  let field = $state<Field>({ name: "", type: "toggle" });

  let error = $state("");

  function newGroup() {
    parentFieldIndex = undefined;
    parentField = { name: "", type: "group", fields: [] };
    fieldIndex = undefined;
    field = { name: "", type: "group", fields: [] };
    dialog.open();
  }

  function newField() {
    parentFieldIndex = undefined;
    parentField = { name: "", type: "group", fields: [] };
    fieldIndex = undefined;
    field = { name: "", type: "toggle" };
    dialog.open();
  }

  export function editField(index: number) {
    parentFieldIndex = undefined;
    parentField = { name: "", type: "group", fields: [] };
    fieldIndex = index;
    field = structuredClone($state.snapshot(surveyRecord.fields[fieldIndex]));
    dialog.open();
  }

  export function newInnerField(index: number) {
    const maybeParent = structuredClone($state.snapshot(surveyRecord.fields[index]));
    if (maybeParent.type != "group") {
      return;
    }

    parentFieldIndex = index;
    parentField = maybeParent;
    fieldIndex = undefined;
    field = { name: "", type: "toggle" };
    dialog.open();
  }

  export function editInnerField(index: number, innerIndex: number) {
    const maybeParent = structuredClone($state.snapshot(surveyRecord.fields[index]));
    if (maybeParent.type != "group") {
      return;
    }

    parentFieldIndex = index;
    parentField = maybeParent;
    fieldIndex = innerIndex;
    field = structuredClone($state.snapshot(parentField.fields[fieldIndex]));
    dialog.open();
  }

  function toggleAllowNegative() {
    if (field.type == "number") {
      field.allowNegative = !field.allowNegative;
    }
  }

  function deleteSelectValue(index: number) {
    if (field.type == "select") {
      field.values = field.values.filter((_, i) => i != index);
    }
  }

  function newSelectValue() {
    if (field.type == "select") {
      field.values = [...field.values, ""];
    }
  }

  function toggleLong() {
    if (field.type == "text") {
      field.long = !field.long;
    }
  }

  function onconfirm() {
    if (!field) {
      error = "Something weird happened";
      return;
    }

    field.name = field.name.trim();

    if (!field.name) {
      error = "Name can't be empty";
      return;
    }

    if (field.type == "select") {
      if (field.values.length == 0) {
        error = "Select must have values";
        return;
      }

      if (field.values.some((value) => value.trim().length == 0)) {
        error = "Don't use an empty value";
        return;
      }
    }

    if (parentFieldIndex == undefined) {
      if (fieldIndex == undefined) {
        surveyRecord.fields = [...surveyRecord.fields, structuredClone($state.snapshot(field))];
      } else {
        surveyRecord.fields[fieldIndex] = structuredClone($state.snapshot(field));
      }
    } else if (field.type != "group") {
      if (fieldIndex == undefined) {
        parentField.fields = [...parentField.fields, structuredClone($state.snapshot(field))];
      } else {
        parentField.fields[fieldIndex] = structuredClone($state.snapshot(field));
      }
      surveyRecord.fields[parentFieldIndex] = structuredClone($state.snapshot(parentField));
    }

    dialog.close();
    onupdate?.();
  }

  function onclose() {
    parentFieldIndex = undefined;
    parentField = { name: "", type: "group", fields: [] };
    fieldIndex = undefined;
    field = { name: "", type: "toggle" };
    error = "";
  }
</script>

<div class="flex flex-wrap gap-2 p-3">
  <Button {disabled} onclick={newGroup}>
    <Icon name="plus" />
    New group
  </Button>
  <Button {disabled} onclick={newField}>
    <Icon name="plus" />
    New field
  </Button>
</div>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  <span>
    {fieldIndex == undefined ? "New" : "Edit"}
    {#if parentFieldIndex != undefined}
      {parentField.name}
    {/if}
    {field.type == "group" ? "group" : "field"}
  </span>

  <label class="flex flex-col">
    Name
    <input bind:value={field.name} class="bg-neutral-800 p-2 text-theme" />
  </label>

  {#if field.type != "group"}
    <label class="flex flex-col">
      Type
      <select
        value={field.type}
        onchange={(e) => {
          switch (e.currentTarget.value) {
            case "select":
              field = {
                name: field.name,
                type: e.currentTarget.value,
                values: [],
              };
              break;
            case "toggle":
            case "number":
            case "text":
            case "rating":
            case "timer":
              field = {
                name: field.name,
                type: e.currentTarget.value,
              };
              break;
          }
        }}
        class="bg-neutral-800 p-2 capitalize text-theme"
      >
        {#each singleFieldTypes as fieldType}
          <option>{fieldType}</option>
        {/each}
      </select>
    </label>

    {#if field.type == "number"}
      <Button onclick={toggleAllowNegative}>
        {#if field.allowNegative}
          <Icon name="square-check" />
        {:else}
          <Icon style="regular" name="square" />
        {/if}
        Allow negative
      </Button>
    {:else if field.type == "select"}
      Values
      {#each field.values as _, i}
        <div class="flex gap-2">
          <input bind:value={field.values[i]} class="grow bg-neutral-800 p-2 text-theme" />
          <Button onclick={() => deleteSelectValue(i)}>
            <Icon name="trash" />
          </Button>
        </div>
      {/each}
      <Button onclick={newSelectValue}>
        <Icon name="plus" />
        New value
      </Button>
    {:else if field.type == "text"}
      <label class="flex flex-col">
        Tip
        <input bind:value={field.tip} class="bg-neutral-800 p-2 text-theme" />
      </label>
      <Button onclick={toggleLong}>
        {#if field.long}
          <Icon name="square-check" />
        {:else}
          <Icon style="regular" name="square" />
        {/if}
        Long
      </Button>
    {/if}
  {/if}

  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
