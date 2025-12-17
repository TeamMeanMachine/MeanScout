<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import type { NumberField } from "$lib/field";
  import { MinusIcon, PlusIcon } from "@lucide/svelte";
  import { fly, type FlyParams } from "svelte/transition";

  let {
    field,
    value = $bindable(),
    onchange = undefined,
  }: {
    field: NumberField;
    value: number;
    onchange?: (() => void) | undefined;
  } = $props();

  let valueFly = $state<FlyParams>({ y: 12 });

  function decrement() {
    valueFly.y = 12;
    value--;
    onchange?.();
  }

  function increment() {
    valueFly.y = -12;
    value++;
    onchange?.();
  }
</script>

<div class="flex flex-col items-center">
  <span class:font-bold={value}>{field.name}</span>
  {#if field.tip}
    <span class="text-xs font-light">{field.tip}</span>
  {/if}
  <div class="flex w-16 flex-col">
    <Button onclick={increment} class="justify-center h-12 active:-translate-y-0.5!">
      <PlusIcon class="text-theme" />
    </Button>
    <div class="flex h-10 items-center justify-center text-center {value > 0 ? 'font-bold' : 'text-xs font-light'}">
      {#key value}
        <span in:fly={valueFly}>{value}</span>
      {/key}
    </div>
    <Button onclick={decrement} disabled={field.allowNegative !== true && value < 1} class="justify-center">
      <MinusIcon class="size-5" />
    </Button>
  </div>
</div>
