<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import { type Field, type GroupField, type SingleField } from "$lib/field";
  import { objectStore, transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";
  import { ArrowDownIcon, ArrowUpIcon, CopyIcon, PenSquareIcon, Trash2Icon } from "@lucide/svelte";
  import EditFieldDialog from "./EditFieldDialog.svelte";

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
    onedit?: () => void;
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

  let error = $state("");

  let index = $derived.by(() => {
    if (parentField) {
      return parentField.fieldIds.findIndex((id) => field.id == id);
    } else {
      return surveyRecord.fieldIds.findIndex((id) => field.id == id);
    }
  });

  function editField() {
    openDialog(EditFieldDialog, {
      surveyRecord,
      field: structuredClone($state.snapshot(field)),
      parentField: structuredClone($state.snapshot(parentField)),
      onupdate() {
        onedit?.();
        closeDialog();
      },
    });
  }

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
          for (const innerFieldId of field.fieldIds) {
            const innerField = fieldRecords.find((f) => f.id == innerFieldId);
            if (!innerField || innerField.type == "group") continue;

            const fieldWithoutId = structuredClone($state.snapshot(innerField)) as SingleField & { id?: number };
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
      for (const innerFieldId of field.fieldIds) {
        fieldStore.delete(innerFieldId);
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
</script>

<span>
  {#if parentField}
    {parentField.name} -
  {/if}
  {field.name}
</span>

<Button onclick={editField}>
  <PenSquareIcon class="text-theme" />
  Edit {field.type}
</Button>
{#if index > 0}
  <Button onclick={() => moveField(-1)}>
    <ArrowUpIcon class="text-theme" />
    Move up
  </Button>
{/if}
{#if index < (parentField ? parentField.fieldIds.length : surveyRecord.fieldIds.length) - 1}
  <Button onclick={() => moveField(1)}>
    <ArrowDownIcon class="text-theme" />
    Move down
  </Button>
{/if}
<Button onclick={duplicateField}>
  <CopyIcon class="text-theme" />
  Duplicate
</Button>
<Button onclick={deleteField} disabled={isExpressionInput}>
  <Trash2Icon class="text-theme" />
  {#if isExpressionInput}
    <div class="flex flex-col">
      Delete
      <small>
        {#if field.type == "group"}
          Inner fields are used for analysis
        {:else}
          This field is used for analysis
        {/if}
      </small>
    </div>
  {:else}
    Delete
  {/if}
</Button>

{#if error}
  <span>Error: {error}</span>
{/if}
