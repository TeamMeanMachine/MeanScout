<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { type Field, type FieldType, type GroupField } from "$lib/field";
  import { idb } from "$lib/idb";
  import type { Survey } from "$lib/survey";
  import { PlusIcon, SquareCheckBigIcon, SquareIcon, Trash2Icon } from "@lucide/svelte";

  let {
    surveyRecord,
    type = "toggle",
    groups,
    groupSelect,
    oncreate,
  }: {
    surveyRecord: IDBRecord<Survey>;
    type?: FieldType;
    groups?: IDBRecord<GroupField>[];
    groupSelect: string;
    oncreate: (id: number, parentId?: number) => void;
  } = $props();

  let field = $state<Field>(initField());
  let error = $state("");

  function initField(): Field {
    switch (type) {
      case "toggle":
      case "number":
      case "text":
      case "rating":
      case "timer":
        return { surveyId: surveyRecord.id, name: "", type };
      case "select":
        return { surveyId: surveyRecord.id, name: "", type: "select", values: [] };
      case "group":
        return { surveyId: surveyRecord.id, name: "", type: "group", fieldIds: [] };
    }
  }

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      field.name = field.name.trim();

      if (groups?.length && !groupSelect) {
        error = "Select a group";
        return;
      }

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

      const addRequest = fieldStore.add($state.snapshot(field));

      addRequest.onsuccess = () => {
        const id = addRequest.result as number;
        const parentField = groups?.find((g) => g.id == Number(groupSelect));

        if (type == "group" || parentField == undefined) {
          oncreate(id);
          closeDialog();
        } else {
          const updatedParentField = {
            ...$state.snapshot(parentField),
            fieldIds: [...parentField.fieldIds, id],
          };

          fieldStore.put(updatedParentField).onsuccess = () => {
            oncreate(id, parentField.id);
            closeDialog();
          };
        }
      };
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

<span class="text-sm">New {groups?.find((g) => g.id.toString() == groupSelect)?.name} {type}</span>

{#if field.type != "group" && groups && groups.length > 1}
  <div class="flex flex-col">
    Group
    <div class="flex gap-3 text-sm">
      <div class="flex flex-wrap gap-2">
        {#each groups as group}
          <Button
            onclick={() => (groupSelect = group.id.toString())}
            class={groupSelect == group.id.toString() ? "text-theme font-bold" : "font-light"}
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
  <input bind:value={field.name} class="text-theme bg-neutral-800 p-2" />
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
        <input bind:value={field.values[i]} class="text-theme grow bg-neutral-800 p-2" />
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
    <input bind:value={field.tip} class="text-theme bg-neutral-800 p-2" />
  </label>
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
