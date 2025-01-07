<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { singleFieldTypes, type Field, type GroupField, type SingleFieldType } from "$lib/field";
  import { objectStore } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    field,
    parentField,
    onupdate,
  }: {
    surveyRecord: IDBRecord<Survey>;
    field: IDBRecord<Field>;
    parentField?: IDBRecord<GroupField> | undefined;
    onupdate: () => void;
  } = $props();

  let changes = $state(structuredClone($state.snapshot(field)));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      changes.name = changes.name.trim();

      if (!changes.name) {
        error = "Name can't be empty";
        return;
      }

      if (changes.type == "select") {
        if (changes.values.length == 0) {
          error = "Select must have values";
          return;
        }

        if (changes.values.some((value) => value.trim().length == 0)) {
          error = "Don't use an empty value";
          return;
        }
      }

      const putRequest = objectStore("fields", "readwrite").put($state.snapshot(changes));
      putRequest.onsuccess = () => {
        onupdate();
        closeDialog();
      };

      putRequest.onerror = () => {
        error = "Could not update field";
      };
    },
  };

  function changeType(to: SingleFieldType) {
    switch (to) {
      case "select":
        changes = {
          id: changes.id,
          surveyId: surveyRecord.id,
          name: changes.name,
          type: to,
          values: [],
        };
        break;
      case "toggle":
      case "number":
      case "text":
      case "rating":
      case "timer":
        changes = {
          id: changes.id,
          surveyId: surveyRecord.id,
          name: changes.name,
          type: to,
        };
        break;
      default:
        const unhandledField: never = to;
        throw new Error(`Unhandled type for field: ${(unhandledField as Field).type}`);
    }
  }

  function toggleAllowNegative() {
    if (changes.type == "number") {
      changes.allowNegative = !changes.allowNegative;
    }
  }

  function deleteSelectValue(index: number) {
    if (changes.type == "select") {
      changes.values = changes.values.filter((_, i) => i != index);
    }
  }

  function newSelectValue() {
    if (changes.type == "select") {
      changes.values = [...changes.values, ""];
    }
  }

  function toggleLong() {
    if (changes.type == "text") {
      changes.long = !changes.long;
    }
  }
</script>

<span>
  Edit
  {#if parentField}
    {parentField.name}
  {/if}
  {changes.type == "group" ? "group" : "field"}
</span>

<label class="flex flex-col">
  Name
  <input bind:value={changes.name} class="bg-neutral-800 p-2 text-theme" />
</label>

{#if changes.type != "group"}
  <label class="flex flex-col">
    Type
    <select
      value={changes.type}
      onchange={(e) => changeType(e.currentTarget.value as SingleFieldType)}
      class="bg-neutral-800 p-2 capitalize text-theme"
    >
      {#each singleFieldTypes as fieldType}
        <option>{fieldType}</option>
      {/each}
    </select>
  </label>

  {#if changes.type == "number"}
    <Button onclick={toggleAllowNegative}>
      {#if changes.allowNegative}
        <Icon name="square-check" />
      {:else}
        <Icon style="regular" name="square" />
      {/if}
      Allow negative
    </Button>
  {:else if changes.type == "select"}
    Values
    {#each changes.values as _, i}
      <div class="flex gap-2">
        <input bind:value={changes.values[i]} class="grow bg-neutral-800 p-2 text-theme" />
        <Button onclick={() => deleteSelectValue(i)}>
          <Icon name="trash" />
        </Button>
      </div>
    {/each}
    <Button onclick={newSelectValue}>
      <Icon name="plus" />
      New value
    </Button>
  {:else if changes.type == "text"}
    <Button onclick={toggleLong}>
      {#if changes.long}
        <Icon name="square-check" />
      {:else}
        <Icon style="regular" name="square" />
      {/if}
      Long
    </Button>
  {/if}

  <label class="flex flex-col">
    Tip
    <input bind:value={changes.tip} class="bg-neutral-800 p-2 text-theme" />
  </label>
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
