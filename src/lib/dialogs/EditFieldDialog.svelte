<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { type Field, type GroupField, type SingleField } from "$lib/field";
  import { objectStore, transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";
  import {
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    CopyIcon,
    PlusIcon,
    SquareCheckBigIcon,
    SquareIcon,
    Trash2Icon,
  } from "@lucide/svelte";

  let {
    surveyRecord,
    fieldRecords,
    field,
    parentField,
    onedit,
    onmove,
    onduplicate,
    ondelete,
  }: {
    surveyRecord: IDBRecord<Survey>;
    fieldRecords: IDBRecord<Field>[];
    field: IDBRecord<Field>;
    parentField?: IDBRecord<GroupField> | undefined;
    onedit: () => void;
    onmove?: (index: number, by: number) => void;
    onduplicate?: (index: number, id: number) => void;
    ondelete?: () => void;
  } = $props();

  const isExpressionInput =
    surveyRecord.type == "match" &&
    surveyRecord.expressions.some((e) => {
      if (e.input.from != "fields") return false;
      return e.input.fieldIds.some((id) => {
        if (field.type == "group") {
          return field.fieldIds.includes(id);
        } else {
          return id == field.id;
        }
      });
    });

  let changes = $state(structuredClone($state.snapshot(field)));

  let index = $derived.by(() => {
    if (parentField) {
      return parentField.fieldIds.findIndex((id) => field.id == id);
    } else {
      return surveyRecord.fieldIds.findIndex((id) => field.id == id);
    }
  });
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
        onedit();
        closeDialog();
      };

      putRequest.onerror = () => {
        error = "Could not update field";
      };
    },
  };

  function moveField(by: number) {
    if (parentField) {
      const updatedFieldIds = structuredClone($state.snapshot(parentField.fieldIds));
      updatedFieldIds.splice(index + by, 0, ...updatedFieldIds.splice(index, 1));

      const request = objectStore("fields", "readwrite").put({
        ...$state.snapshot(parentField),
        fieldIds: updatedFieldIds,
      });

      request.onsuccess = () => {
        onmove?.(index, by);
        closeDialog();
      };

      request.onerror = () => {
        error = "Could not move field";
      };
    } else {
      onmove?.(index, by);
      closeDialog();
    }
  }

  function duplicateField() {
    const newTransaction = transaction("fields", "readwrite");
    const fieldStore = newTransaction.objectStore("fields");

    newTransaction.onabort = () => {
      error = "Could not duplicate field";
    };

    const fieldWithoutId = structuredClone($state.snapshot(field)) as Field & { id?: number };
    delete fieldWithoutId.id;

    const duplicateRequest = fieldStore.add(fieldWithoutId);

    duplicateRequest.onsuccess = async () => {
      const id = duplicateRequest.result as number;

      if (parentField) {
        const updatedParentField = structuredClone($state.snapshot(parentField));
        updatedParentField.fieldIds.splice(index + 1, 0, id);
        fieldStore.put(updatedParentField).onsuccess = () => {
          onduplicate?.(index, id);
          closeDialog();
        };
      } else {
        if (field.type == "group") {
          const newIds: number[] = [];
          const nestedFields = field.fieldIds
            .map((id) => fieldRecords.find((f) => f.id == id))
            .filter((f) => f !== undefined && f.type != "group");

          for (const nestedField of nestedFields) {
            const fieldWithoutId = structuredClone($state.snapshot(nestedField)) as SingleField & { id?: number };
            delete fieldWithoutId.id;

            const newId = await new Promise<number>((resolve, reject) => {
              const request = fieldStore.add(fieldWithoutId);
              request.onsuccess = () => {
                if (request.result) {
                  resolve(request.result as number);
                } else {
                  reject();
                }
              };
            });

            newIds.push(newId);
          }

          fieldStore.put({ ...fieldWithoutId, id, fieldIds: newIds });
        }

        onduplicate?.(index, id);
        closeDialog();
      }
    };
  }

  function deleteField() {
    const deleteTransaction = transaction("fields", "readwrite");
    const fieldStore = deleteTransaction.objectStore("fields");

    fieldStore.delete(field.id);
    if (parentField) {
      const updatedParentField = structuredClone($state.snapshot(parentField));
      updatedParentField.fieldIds = updatedParentField.fieldIds.filter((id) => field.id != id);
      fieldStore.put(updatedParentField);
    } else if (field.type == "group") {
      for (const nestedFieldId of field.fieldIds) {
        fieldStore.delete(nestedFieldId);
      }
    }

    deleteTransaction.oncomplete = () => {
      ondelete?.();
      closeDialog();
    };

    deleteTransaction.onabort = () => {
      error = "Could not delete field";
    };
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

<div class="flex items-center justify-between gap-2">
  <div class="flex gap-2">
    <Button disabled={index <= 0} onclick={() => moveField(-1)}>
      {#if parentField}
        <ArrowLeftIcon class="text-theme size-5" />
      {:else}
        <ArrowUpIcon class="text-theme size-5" />
      {/if}
    </Button>
    <Button
      disabled={index >= (parentField ? parentField.fieldIds.length : surveyRecord.fieldIds.length) - 1}
      onclick={() => moveField(1)}
    >
      {#if parentField}
        <ArrowRightIcon class="text-theme size-5" />
      {:else}
        <ArrowDownIcon class="text-theme size-5" />
      {/if}
    </Button>
  </div>
  <span class="grow text-center text-sm">
    Edit
    {#if parentField}
      {parentField.name}
    {/if}
    {changes.type}
  </span>
  <div class="flex gap-2">
    <Button onclick={duplicateField}>
      <CopyIcon class="text-theme size-5" />
    </Button>
    <Button onclick={deleteField} disabled={isExpressionInput}>
      <Trash2Icon class="text-theme size-5" />
    </Button>
  </div>
</div>

<label class="flex flex-col">
  Name
  <input bind:value={changes.name} class="text-theme bg-neutral-800 p-2" />
</label>

{#if changes.type != "group"}
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
