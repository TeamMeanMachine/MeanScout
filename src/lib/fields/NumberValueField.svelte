<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import type { NumberField } from "$lib/field";
  import { MinusIcon, PlusIcon } from "@lucide/svelte";

  let {
    field,
    value = $bindable(),
    onchange = undefined,
  }: {
    field: NumberField;
    value: number;
    onchange?: (() => void) | undefined;
  } = $props();

  function decrement() {
    value--;
    onchange && onchange();
  }

  function increment() {
    value++;
    onchange && onchange();
  }
</script>

<div class="flex flex-col">
  <span>{field.name}</span>
  {#if field.tip}
    <small class="font-light">{field.tip}</small>
  {/if}
  <div class="flex flex-wrap">
    <Button onclick={decrement} disabled={field.allowNegative !== true && value < 1}>
      <MinusIcon class="text-theme" />
    </Button>
    <span class="w-12 bg-neutral-800 p-2 text-center {value > 0 ? 'font-bold' : 'font-light'}">
      {value}
    </span>
    <Button onclick={increment}>
      <PlusIcon class="text-theme" />
    </Button>
  </div>
</div>
