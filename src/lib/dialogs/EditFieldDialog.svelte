<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { singleFieldTypes, type Field, type GroupField, type SingleFieldType } from "$lib/field";
  import { objectStore } from "$lib/idb";
  import type { Survey } from "$lib/survey";
  import { PlusIcon, SquareCheckBigIcon, SquareIcon, Trash2Icon } from "@lucide/svelte";

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

  function toggleRadio() {
    if (changes.type == "select") {
      changes.radio = !changes.radio;
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
  <input bind:value={changes.name} class="text-theme bg-neutral-800 p-2" />
</label>

{#if changes.type != "group"}
  <label class="flex flex-col">
    Type
    <select
      value={changes.type}
      onchange={(e) => changeType(e.currentTarget.value as SingleFieldType)}
      class="text-theme bg-neutral-800 p-2 capitalize"
    >
      {#each singleFieldTypes as fieldType}
        <option>{fieldType}</option>
      {/each}
    </select>
  </label>

  {#if changes.type == "number"}
    <Button onclick={toggleAllowNegative}>
      {#if changes.allowNegative}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-theme" />
      {/if}
      Allow negative
    </Button>
  {:else if changes.type == "select"}
    <Button onclick={toggleRadio}>
      {#if changes.radio}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-theme" />
      {/if}
      Radio
    </Button>
    Values
    {#each changes.values as _, i}
      <div class="flex gap-2">
        <input bind:value={changes.values[i]} class="text-theme grow bg-neutral-800 p-2" />
        <Button onclick={() => deleteSelectValue(i)}>
          <Trash2Icon class="text-theme" />
        </Button>
      </div>
    {/each}
    <Button onclick={newSelectValue}>
      <PlusIcon class="text-theme" />
      New value
    </Button>
  {:else if changes.type == "text"}
    <Button onclick={toggleLong}>
      {#if changes.long}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-theme" />
      {/if}
      Long
    </Button>
  {/if}

  <label class="flex flex-col">
    Tip
    <input bind:value={changes.tip} class="text-theme bg-neutral-800 p-2" />
  </label>
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
