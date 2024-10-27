<script lang="ts">
  import { parseValueFromString } from "$lib";
  import type { ConvertExpression } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    expression,
  }: {
    expression: ConvertExpression;
  } = $props();

  let converters = $state(structuredClone($state.snapshot(expression.converters)));
  let defaultTo = $state(structuredClone($state.snapshot(expression.defaultTo)));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      expression.converters = structuredClone($state.snapshot(converters)).map(({ from, to }) => ({
        from: parseValueFromString(from),
        to: parseValueFromString(to),
      }));
      expression.defaultTo = parseValueFromString(structuredClone($state.snapshot(defaultTo)));
      closeDialog();
    },
  };
</script>

<span>Converters</span>

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

<Button onclick={() => converters.push({ from: "", to: "" })}>
  <Icon name="plus" />
  New converter
</Button>

<label class="flex flex-col">
  Default to
  <input bind:value={defaultTo} class="bg-neutral-800 p-2 text-theme" />
  <small>Leave blank to keep input</small>
</label>
