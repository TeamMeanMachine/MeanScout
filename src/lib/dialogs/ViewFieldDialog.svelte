<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import { type Field, type GroupField, type SingleField } from "$lib/field";
  import type { Survey } from "$lib/survey";
  import EditFieldDialog from "./EditFieldDialog.svelte";

  let {
    surveyRecord,
    index,
    parentIndex,
  }: {
    surveyRecord: IDBRecord<Survey>;
    index: number;
    parentIndex?: number | undefined;
  } = $props();

  let field = $state<Field>({ name: "", type: "toggle" });
  let parentField = $state<GroupField | undefined>();

  export const { onopen }: DialogExports = {
    onopen(open) {
      refresh();
      open();
    },
  };

  function refresh() {
    if (parentIndex == undefined) {
      parentField = undefined;
      field = structuredClone($state.snapshot(surveyRecord.fields[index]));
    } else {
      parentField = structuredClone($state.snapshot(surveyRecord.fields[parentIndex] as GroupField));
      field = structuredClone($state.snapshot(parentField.fields[index]));
    }
  }

  function editField() {
    openDialog(EditFieldDialog, { surveyRecord, index, parentIndex, onupdate: refresh });
  }

  function moveField(by: number) {
    if (parentIndex == undefined || parentField == undefined) {
      surveyRecord.fields.splice(index + by, 0, ...surveyRecord.fields.splice(index, 1));
    } else {
      parentField.fields.splice(index + by, 0, ...parentField.fields.splice(index, 1));
      surveyRecord.fields[parentIndex] = structuredClone($state.snapshot(parentField));
    }

    surveyRecord.modified = new Date();
    closeDialog();
  }

  function duplicateField() {
    if (parentIndex == undefined || parentField == undefined) {
      surveyRecord.fields.splice(index, 0, structuredClone($state.snapshot(field)));
    } else {
      parentField.fields.splice(index, 0, structuredClone($state.snapshot(field as SingleField)));
      surveyRecord.fields[parentIndex] = structuredClone($state.snapshot(parentField));
    }

    surveyRecord.modified = new Date();
    closeDialog();
  }

  function deleteField() {
    if (parentIndex == undefined || parentField == undefined) {
      surveyRecord.fields.splice(index, 1);
    } else {
      parentField.fields.splice(index, 1);
      surveyRecord.fields[parentIndex] = structuredClone($state.snapshot(parentField));
    }

    surveyRecord.modified = new Date();
    closeDialog();
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
{#if index < (parentField == undefined ? surveyRecord.fields.length : parentField.fields.length) - 1}
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
