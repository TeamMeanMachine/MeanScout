<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import { type DetailedGroupField, type DetailedSingleField, type Field, type GroupField } from "$lib/field";
  import { objectStore, transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";
  import EditFieldDialog from "./EditFieldDialog.svelte";

  let {
    surveyRecord,
    detailedFields,
    detailedInnerFields,
    field,
    parentField,
    onupdate,
  }: {
    surveyRecord: IDBRecord<Survey>;
    detailedFields: Map<number, DetailedSingleField | DetailedGroupField>;
    detailedInnerFields: Map<number, DetailedSingleField>;
    field: IDBRecord<Field>;
    parentField?: IDBRecord<GroupField> | undefined;
    onupdate?: () => void;
  } = $props();

  let error = $state("");

  let index = $derived.by(() => {
    if (parentField) {
      return parentField.fieldIds.findIndex((id) => field.id == id);
    } else {
      return surveyRecord.fieldIds.findIndex((id) => field.id == id);
    }
  });

  function refresh() {
    if (parentField != undefined) {
      const maybeParentField = detailedFields.get(parentField.id);
      if (maybeParentField?.type == "group") {
        parentField = structuredClone($state.snapshot(maybeParentField.field));
      }
    }

    const maybeField = parentField ? detailedInnerFields.get(field.id) : detailedFields.get(field.id);
    if (maybeField) {
      field = structuredClone($state.snapshot(maybeField.field));
    }
  }

  function editField() {
    openDialog(EditFieldDialog, {
      surveyRecord,
      field: structuredClone($state.snapshot(field)),
      parentField: structuredClone($state.snapshot(parentField)),
      onupdate: refresh,
    });
  }

  function moveField(by: number) {
    if (parentField == undefined) {
      surveyRecord.fieldIds.splice(index + by, 0, ...surveyRecord.fieldIds.splice(index, 1));
      surveyRecord.modified = new Date();
      closeDialog();
    } else {
      const updatedFieldIds = structuredClone($state.snapshot(parentField.fieldIds));
      updatedFieldIds.splice(index + by, 0, ...updatedFieldIds.splice(index, 1));

      const request = objectStore("fields", "readwrite").put({
        ...$state.snapshot(parentField),
        fieldIds: updatedFieldIds,
      });

      request.onsuccess = () => {
        surveyRecord.modified = new Date();
        onupdate?.();
        closeDialog();
      };

      request.onerror = () => {
        error = "Could not move field";
      };
    }
  }

  function duplicateField() {
    const newTransaction = transaction("fields", "readwrite");
    const fieldStore = newTransaction.objectStore("fields");

    newTransaction.onabort = () => {
      error = "Could not duplicate field";
    };

    newTransaction.oncomplete = () => {
      surveyRecord.modified = new Date();
      onupdate?.();
      closeDialog();
    };

    const fieldWithoutId = structuredClone($state.snapshot(field)) as Field & { id?: number };
    delete fieldWithoutId.id;

    const duplicateRequest = fieldStore.add(fieldWithoutId);

    duplicateRequest.onsuccess = () => {
      const id = duplicateRequest.result as number;

      if (parentField == undefined) {
        surveyRecord.fieldIds.push(id);
      } else {
        const updatedParentField = { ...$state.snapshot(parentField), fieldIds: [...parentField.fieldIds, id] };
        fieldStore.put(updatedParentField);
      }
    };
  }

  function deleteField() {
    const deleteTransaction = transaction("fields", "readwrite");
    const fieldStore = deleteTransaction.objectStore("fields");

    fieldStore.delete(field.id);
    if (parentField) {
      parentField.fieldIds = parentField.fieldIds.filter((id) => field.id != id);
      fieldStore.put($state.snapshot(parentField));
    } else if (field.type == "group") {
      for (const innerFieldId of field.fieldIds) {
        fieldStore.delete(innerFieldId);
      }
    }

    deleteTransaction.oncomplete = () => {
      if (parentField == undefined) {
        surveyRecord.fieldIds = surveyRecord.fieldIds.filter((id) => field.id != id);
      }

      surveyRecord.modified = new Date();
      onupdate?.();
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
  <Icon name="pen" />
  Edit {field.type}
</Button>
{#if index > 0}
  <Button onclick={() => moveField(-1)}>
    <Icon name="arrow-up" />
    Move up
  </Button>
{/if}
{#if index < (parentField ? parentField.fieldIds.length : surveyRecord.fieldIds.length) - 1}
  <Button onclick={() => moveField(1)}>
    <Icon name="arrow-down" />
    Move down
  </Button>
{/if}
<Button onclick={duplicateField}>
  <Icon name="clone" />
  Duplicate
</Button>
<Button onclick={deleteField}>
  <Icon name="trash" />
  Delete
</Button>

{#if error}
  <span>Error: {error}</span>
{/if}
