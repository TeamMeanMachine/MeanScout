<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { singleFieldTypes, type Field, type GroupField, type SingleField, type SingleFieldType } from "$lib/field";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    index,
    parentIndex,
    onupdate,
  }: {
    surveyRecord: IDBRecord<Survey>;
    index: number;
    parentIndex?: number | undefined;
    onupdate?: () => void;
  } = $props();

  let field = $state<Field>({ name: "", type: "toggle" });
  let parentField = $state<GroupField | undefined>();
  let error = $state("");

  export const { onopen, onconfirm }: DialogExports = {
    onopen(open) {
      if (parentIndex == undefined) {
        parentField = undefined;
        field = structuredClone($state.snapshot(surveyRecord.fields[index]));
      } else {
        parentField = structuredClone($state.snapshot(surveyRecord.fields[parentIndex] as GroupField));
        field = structuredClone($state.snapshot(parentField.fields[index]));
      }

      open();
    },
    onconfirm() {
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

      if (parentIndex == undefined || parentField == undefined) {
        surveyRecord.fields[index] = structuredClone($state.snapshot(field));
      } else {
        parentField.fields[index] = structuredClone($state.snapshot(field as SingleField));
        surveyRecord.fields[parentIndex] = structuredClone($state.snapshot(parentField));
      }

      surveyRecord.modified = new Date();
      onupdate?.();
      closeDialog();
    },
  };

  function changeType(to: SingleFieldType) {
    switch (to) {
      case "select":
        field = {
          name: field.name,
          type: to,
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
          type: to,
        };
        break;
      default:
        const unhandledType: never = to;
        throw new Error(`Unhandled type for field ${unhandledType}`);
    }
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
</script>

<span>
  Edit
  {#if parentField}
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
      onchange={(e) => changeType(e.currentTarget.value as SingleFieldType)}
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
    <Button onclick={toggleLong}>
      {#if field.long}
        <Icon name="square-check" />
      {:else}
        <Icon style="regular" name="square" />
      {/if}
      Long
    </Button>
  {/if}

  <label class="flex flex-col">
    Tip
    <input bind:value={field.tip} class="bg-neutral-800 p-2 text-theme" />
  </label>
{/if}

{#if error}
  <span>{error}</span>
{/if}
