<script lang="ts">
  import { parseValueFromString } from "$lib";
  import type { ConvertExpression } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";

  let {
    expression = $bindable(),
    converters,
    defaultTo,
  }: {
    expression: ConvertExpression;
    converters: {
      from: any;
      to: any;
    }[];
    defaultTo: any;
  } = $props();

  let dialog: Dialog;

  function onconfirm() {
    expression.converters = structuredClone($state.snapshot(converters)).map(({ from, to }) => ({
      from: parseValueFromString(from),
      to: parseValueFromString(to),
    }));
    expression.defaultTo = parseValueFromString(structuredClone($state.snapshot(defaultTo)));
    dialog.close();
  }

  function onclose() {
    converters = structuredClone($state.snapshot(expression.converters));
    defaultTo = structuredClone($state.snapshot(expression.defaultTo));
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="pen" />
  Edit Converters
</Button>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  Converters
  {#each converters as converter, converterIndex}
    <div class="flex flex-wrap items-end gap-2">
      <Button onclick={() => (converters = converters.toSpliced(converterIndex, 1))}>
        <Icon name="trash" />
      </Button>
      <div class="flex flex-wrap items-end">
        <label class="flex flex-col">
          From
          <input bind:value={converter.from} class="w-36 bg-neutral-800 p-2 text-theme" />
        </label>
        <div class="p-2">
          <Icon name="arrow-right" />
        </div>
        <label class="flex flex-col">
          To
          <input bind:value={converter.to} class="w-36 bg-neutral-800 p-2 text-theme" />
        </label>
      </div>
    </div>
  {/each}
  <Button onclick={() => (converters = [...converters, { from: "", to: "" }])}>
    <Icon name="plus" />
    New converter
  </Button>
  <label class="flex flex-col">
    Default to
    <input bind:value={defaultTo} class="bg-neutral-800 p-2 text-theme" />
  </label>
  <small>Leave blank to keep input</small>
</Dialog>
