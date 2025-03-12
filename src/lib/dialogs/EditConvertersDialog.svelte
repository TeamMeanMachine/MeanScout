<script lang="ts">
  import type { ConvertExpressionMethod } from "$lib/expression";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { ArrowRightIcon, PlusIcon, Trash2Icon } from "@lucide/svelte";

  let {
    expressionMethod,
    onedit,
  }: {
    expressionMethod: ConvertExpressionMethod;
    onedit: (changes: ConvertExpressionMethod) => void;
  } = $props();

  let changes = $state(structuredClone($state.snapshot(expressionMethod)));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onedit(changes);
      closeDialog();
    },
  };
</script>

<span>Converters</span>

{#each changes.converters as converter, converterIndex}
  <div class="flex flex-wrap items-end gap-2">
    <Button onclick={() => (changes.converters = changes.converters.toSpliced(converterIndex, 1))}>
      <Trash2Icon class="text-theme" />
    </Button>
    <div class="flex flex-wrap items-end">
      <label class="flex flex-col">
        From
        <input bind:value={converter.from} class="text-theme w-36 bg-neutral-800 p-2" />
      </label>
      <div class="p-2">
        <ArrowRightIcon class="text-theme" />
      </div>
      <label class="flex flex-col">
        To
        <input bind:value={converter.to} class="text-theme w-36 bg-neutral-800 p-2" />
      </label>
    </div>
  </div>
{/each}

<Button onclick={() => changes.converters.push({ from: "", to: "" })}>
  <PlusIcon class="text-theme" />
  New converter
</Button>

<label class="flex flex-col">
  Default to
  <input bind:value={changes.defaultTo} class="text-theme bg-neutral-800 p-2" />
  <small>Leave blank to keep input</small>
</label>
