<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Field } from "$lib/field";

  let {
    fields = $bindable(),
    field = $bindable(),
    fieldIndex,
    onchange = undefined,
  }: {
    fields: Field[];
    field: Field;
    fieldIndex: number;
    onchange?: (() => void) | undefined;
  } = $props();

  let dialog: Dialog;

  function duplicateField() {
    fields = fields.toSpliced(fieldIndex, 0, structuredClone($state.snapshot(field)));
    onchange && onchange();
    dialog.close();
  }

  function deleteField() {
    fields = fields.filter((_, i) => i != fieldIndex);
    onchange && onchange();
    dialog.close();
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="ellipsis-vertical" />
</Button>

<Dialog bind:this={dialog}>
  <span>
    Field: {field.name}
    <br />
    Type: {field.type}
  </span>
  <Button onclick={duplicateField}>
    <Icon name="clone" />
    Clone field
  </Button>
  <Button onclick={deleteField}>
    <Icon name="trash" />
    Delete field
  </Button>
</Dialog>
