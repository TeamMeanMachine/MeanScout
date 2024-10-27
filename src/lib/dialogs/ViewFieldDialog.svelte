<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import { type Field, type GroupField, type SingleField } from "$lib/field";
  import type { Survey } from "$lib/survey";
  import EditFieldDialog from "./EditFieldDialog.svelte";

  let {
    surveyRecord = $bindable(),
    action,
  }: {
    surveyRecord: IDBRecord<Survey>;
    action: { type: "field"; index: number } | { type: "inner-field"; index: number; innerIndex: number };
  } = $props();

  let parentFieldIndex = $state<number | undefined>();
  let parentField = $state<GroupField>({ name: "", type: "group", fields: [] });

  let fieldIndex = $state<number>(-1);
  let field = $state<Field>({ name: "", type: "toggle" });

  let error = $state("");

  export const { onopen }: DialogExports = {
    onopen(open) {
      if (action.type == "field") {
        fieldIndex = action.index;
        field = structuredClone($state.snapshot(surveyRecord.fields[fieldIndex]));
      } else if (action.type == "inner-field") {
        parentFieldIndex = action.index;
        parentField = structuredClone($state.snapshot(surveyRecord.fields[parentFieldIndex] as GroupField));
        fieldIndex = action.innerIndex;
        field = structuredClone($state.snapshot(parentField.fields[fieldIndex]));
      }
      open();
    },
  };

  function refresh() {
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

    closeDialog();
  }

  function duplicateField() {
    if (parentFieldIndex == undefined) {
      surveyRecord.fields = surveyRecord.fields.toSpliced(fieldIndex, 0, structuredClone($state.snapshot(field)));
    } else {
      parentField.fields = parentField.fields.toSpliced(
        fieldIndex,
        0,
        structuredClone($state.snapshot(field as SingleField)),
      );
      surveyRecord.fields[parentFieldIndex] = structuredClone($state.snapshot(parentField));
    }

    closeDialog();
  }

  function deleteField() {
    if (parentFieldIndex == undefined) {
      surveyRecord.fields = surveyRecord.fields.filter((_, i) => i != fieldIndex);
    } else {
      parentField.fields = parentField.fields.filter((_, i) => i != fieldIndex);
      surveyRecord.fields[parentFieldIndex] = structuredClone($state.snapshot(parentField));
    }

    closeDialog();
  }
</script>

<span>
  {#if parentFieldIndex != undefined}
    {parentField.name} -
  {/if}
  {field.name}
</span>

<Button
  onclick={() => {
    openDialog(EditFieldDialog, { surveyRecord, action, onupdate: refresh });
  }}
>
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
