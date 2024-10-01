<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { type Field, type GroupField } from "$lib/field";
  import type { Survey } from "$lib/survey";
  import UpsertFieldDialog from "./UpsertFieldDialog.svelte";

  let {
    upsertFieldDialog,
    surveyRecord = $bindable(),
  }: {
    upsertFieldDialog: UpsertFieldDialog | undefined;
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  let dialog: Dialog;

  let parentFieldIndex = $state<number | undefined>();
  let parentField = $state<GroupField>({ name: "", type: "group", fields: [] });

  let fieldIndex = $state<number>(-1);
  let field = $state<Field>({ name: "", type: "toggle" });

  let error = $state("");

  export function viewField(index: number) {
    parentFieldIndex = undefined;
    parentField = { name: "", type: "group", fields: [] };
    fieldIndex = index;
    field = structuredClone($state.snapshot(surveyRecord.fields[fieldIndex]));
    dialog.open();
  }

  export function viewInnerField(index: number, innerIndex: number) {
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

  export function refresh() {
    if (fieldIndex < 0) return;

    if (parentFieldIndex == undefined) {
      field = surveyRecord.fields[fieldIndex];
    } else {
      const maybeParent = structuredClone($state.snapshot(surveyRecord.fields[parentFieldIndex]));
      if (maybeParent.type != "group") {
        return;
      }

      parentField = maybeParent;
      field = structuredClone($state.snapshot(parentField.fields[fieldIndex]));
    }
  }

  function onclose() {
    parentFieldIndex = undefined;
    parentField = { name: "", type: "group", fields: [] };
    fieldIndex = -1;
    field = { name: "", type: "toggle" };
    error = "";
  }

  function moveField(by: number) {
    if (parentFieldIndex == undefined) {
      surveyRecord.fields = surveyRecord.fields.toSpliced(
        fieldIndex + by,
        0,
        ...surveyRecord.fields.splice(fieldIndex, 1),
      );
    } else {
      parentField.fields = parentField.fields.toSpliced(
        fieldIndex + by,
        0,
        ...parentField.fields.splice(fieldIndex, 1),
      );
      surveyRecord.fields[parentFieldIndex] = structuredClone($state.snapshot(parentField));
    }
    dialog.close();
  }

  function editField() {
    if (parentFieldIndex == undefined) {
      upsertFieldDialog?.editField(fieldIndex);
    } else {
      upsertFieldDialog?.editInnerField(parentFieldIndex, fieldIndex);
    }
  }

  function duplicateField() {
    if (parentFieldIndex == undefined) {
      surveyRecord.fields = surveyRecord.fields.toSpliced(fieldIndex, 0, structuredClone($state.snapshot(field)));
    } else if (field.type != "group") {
      parentField.fields = parentField.fields.toSpliced(fieldIndex, 0, structuredClone($state.snapshot(field)));
      surveyRecord.fields[parentFieldIndex] = structuredClone($state.snapshot(parentField));
    }
    dialog.close();
  }

  function deleteField() {
    if (parentFieldIndex == undefined) {
      surveyRecord.fields = surveyRecord.fields.filter((_, i) => i != fieldIndex);
    } else {
      parentField.fields = parentField.fields.filter((_, i) => i != fieldIndex);
      surveyRecord.fields[parentFieldIndex] = structuredClone($state.snapshot(parentField));
    }
    dialog.close();
  }
</script>

<Dialog bind:this={dialog} {onclose}>
  <span>
    {#if parentFieldIndex != undefined}
      {parentField.name} -
    {/if}
    {field.name}
  </span>

  <Button onclick={editField}>
    <Icon name="pen" />
    Edit {field.type}
  </Button>
  {#if fieldIndex > 0}
    <Button onclick={() => moveField(-1)}>
      <Icon name="arrow-up" />
      Move up
    </Button>
  {/if}
  {#if fieldIndex < (parentFieldIndex == undefined ? surveyRecord.fields.length : parentField.fields.length) - 1}
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
    <span>{error}</span>
  {/if}
</Dialog>
