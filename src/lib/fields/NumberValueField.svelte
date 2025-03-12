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

  function increment() {
    value++;
    onchange && onchange();
  }

  function decrement() {
    value--;
    onchange && onchange();
  }
</script>

<div class="flex flex-col">
  <span class="font-light">{field.name}</span>
  <div class="flex flex-wrap">
    <Button onclick={increment}>
      <PlusIcon class="text-theme" />
    </Button>
    <span class="w-12 bg-neutral-800 p-2 text-center {value > 0 ? 'font-bold' : 'font-light'}">
      {value}
    </span>
    <Button onclick={decrement} disabled={field.allowNegative !== true && value < 1}>
      <MinusIcon class="text-theme" />
    </Button>
  </div>
  {#if field.tip}
    <small class="pt-1">{field.tip}</small>
  {/if}
</div>
