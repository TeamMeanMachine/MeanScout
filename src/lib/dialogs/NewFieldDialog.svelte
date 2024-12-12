<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { singleFieldTypes, type Field, type GroupField } from "$lib/field";
  import { transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    type = "field",
    parentField,
    onupdate,
  }: {
    surveyRecord: IDBRecord<Survey>;
    type?: "field" | "group";
    parentField?: IDBRecord<GroupField> | undefined;
    onupdate?: () => void;
  } = $props();

  let field = $state<Field>(
    type == "group"
      ? { surveyId: surveyRecord.id, name: "", type: "group", fieldIds: [] }
      : { surveyId: surveyRecord.id, name: "", type: "number" },
  );
  let error = $state("");

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

      const addTransaction = transaction("fields", "readwrite");
      const fieldStore = addTransaction.objectStore("fields");

      addTransaction.onabort = () => {
        error = "Could not create new field";
      };

      addTransaction.oncomplete = () => {
        surveyRecord.modified = new Date();
        onupdate?.();
        closeDialog();
      };

      const addRequest = fieldStore.add($state.snapshot(field));

      addRequest.onsuccess = () => {
        const id = addRequest.result as number;

        if (parentField == undefined) {
          surveyRecord.fieldIds.push(id);
        } else {
          const updatedParentField = { ...$state.snapshot(parentField), fieldIds: [...parentField.fieldIds, id] };
          fieldStore.put(updatedParentField);
        }
      };
    },
  };

  function changeType(to: string) {
    switch (to) {
      case "select":
        field = {
          surveyId: surveyRecord.id,
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
          surveyId: surveyRecord.id,
          name: field.name,
          type: to,
        };
        break;
    }
  }

  function toggleAllowNegative() {
    if (field.type == "number") {
      field.allowNegative = !field.allowNegative;
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

<span>New {parentField?.name} {type}</span>

<label class="flex flex-col">
  Name
  <input bind:value={field.name} class="bg-neutral-800 p-2 text-theme" />
</label>

{#if field.type != "group"}
  <label class="flex flex-col">
    Type
    <select
      value={field.type}
      onchange={(e) => changeType(e.currentTarget.value)}
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
  <span>Error: {error}</span>
{/if}
