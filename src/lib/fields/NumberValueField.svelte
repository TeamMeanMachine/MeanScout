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

<div class="flex flex-col items-center">
  <span class:font-bold={value}>{field.name}</span>
  {#if field.tip}
    <span class="text-xs font-light">{field.tip}</span>
  {/if}
  <div class="flex w-16 flex-col">
    <Button onclick={increment} class="justify-center active:-top-0.5!">
      <PlusIcon class="text-theme size-5" />
    </Button>
    <div class="flex h-10 items-center justify-center text-center {value > 0 ? 'font-bold' : 'text-xs font-light'}">
      {value}
    </div>
    <Button onclick={decrement} disabled={field.allowNegative !== true && value < 1} class="justify-center">
      <MinusIcon class="size-5" />
    </Button>
  </div>
</div>
