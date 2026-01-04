<script lang="ts">
  import { PlusIcon, SquareCheckBigIcon, SquareIcon, Trash2Icon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { type Field, type FieldType, type GroupField } from "$lib/field";
  import { idb } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    type,
    groups,
    groupSelect,
    oncreate,
  }: {
    surveyRecord: Survey;
    type: FieldType;
    groups?: GroupField[];
    groupSelect: string;
    oncreate: (id: string, parentId?: string) => void;
  } = $props();

  let field = $state<Field>(initField());
  let error = $state("");

  function initField(): Field {
    const initId = idb.generateId({ randomChars: 0 });

    switch (type) {
      case "toggle":
      case "number":
      case "text":
      case "rating":
      case "timer":
        return { id: initId, surveyId: surveyRecord.id, name: "", type };
      case "select":
        return { id: initId, surveyId: surveyRecord.id, name: "", type, values: [] };
      case "group":
        return { id: initId, surveyId: surveyRecord.id, name: "", type, fieldIds: [] };
    }
  }

  export const { onconfirm }: DialogExports = {
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

      const addTransaction = idb.transaction("fields", "readwrite");
      const fieldStore = addTransaction.objectStore("fields");

      addTransaction.onabort = () => {
        error = "Could not create new field";
      };

      fieldStore.add($state.snapshot(field));

      const parentField = groups?.find((g) => g.id == groupSelect);

      if (type == "group" || parentField == undefined) {
        addTransaction.oncomplete = () => {
          oncreate(field.id);
          closeDialog();
        };
      } else {
        fieldStore.put({ ...$state.snapshot(parentField), fieldIds: [...parentField.fieldIds, field.id] });

        addTransaction.oncomplete = () => {
          oncreate(field.id, parentField.id);
          closeDialog();
        };
      }
    },
  };

  function toggleAllowNegative() {
    if (field.type == "number") {
      field.allowNegative = !field.allowNegative;
    }
  }

  function toggleRadio() {
    if (field.type == "select") {
      field.radio = !field.radio;
    }
  }

  function deleteSelectValue(index: number) {
    if (field.type == "select") {
      field.values.splice(index, 1);
    }
  }

  function newSelectValue() {
    if (field.type == "select") {
      field.values.push("");
    }
  }

  function toggleLong() {
    if (field.type == "text") {
      field.long = !field.long;
    }
  }
</script>

<span class="text-sm">New {groups?.find((g) => g.id == groupSelect)?.name} {type}</span>

{#if field.type != "group" && groups && groups.length}
  <div class="flex flex-col">
    Group
    <div class="flex gap-3 text-sm">
      <div class="flex flex-wrap gap-2">
        <Button onclick={() => (groupSelect = "")} class={groupSelect == "" ? "font-bold text-theme" : "font-light"}>
          --
        </Button>
        {#each groups as group}
          <Button
            onclick={() => (groupSelect = group.id)}
            class={groupSelect == group.id ? "font-bold text-theme" : "font-light"}
          >
            {group.name}
          </Button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<label class="flex flex-col">
  Name
  <input bind:value={field.name} class="bg-neutral-800 p-2 text-theme" />
</label>

{#if field.type != "group"}
  {#if field.type == "number"}
    <Button onclick={toggleAllowNegative}>
      {#if field.allowNegative}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-theme" />
      {/if}
      Allow negative
    </Button>
  {:else if field.type == "select"}
    <Button onclick={toggleRadio}>
      {#if field.radio}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-theme" />
      {/if}
      Radio
    </Button>
    Values
    {#each field.values as _, i}
      <div class="flex gap-2">
        <input bind:value={field.values[i]} class="grow bg-neutral-800 p-2 text-theme" />
        <Button onclick={() => deleteSelectValue(i)}>
          <Trash2Icon class="text-theme" />
        </Button>
      </div>
    {/each}
    <Button onclick={newSelectValue}>
      <PlusIcon class="text-theme" />
      New value
    </Button>
  {:else if field.type == "text"}
    <Button onclick={toggleLong}>
      {#if field.long}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-theme" />
      {/if}
      Long
    </Button>
  {/if}

  <label class="flex flex-col">
    Tip
    <input bind:value={field.tip} class="bg-neutral-800 p-2 text-theme" />
  </label>
{/if}

<div class="flex flex-wrap items-end gap-2 text-sm">
  <label class="flex grow flex-col">
    ID
    <input bind:value={field.id} class="bg-neutral-800 p-2 text-theme" />
  </label>
  <Button onclick={() => (field.id = idb.generateId({ randomChars: 0 }))}>
    <span class="font-bold">Random</span>
  </Button>
</div>

{#if error}
  <span>Error: {error}</span>
{/if}
