<script lang="ts">
  import { MinusIcon, PlusIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import type { NumberField } from "$lib/field";
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

  function decrement(by = 1) {
    valueFly.y = 12;
    value -= by;
    if (value < 0 && !field.allowNegative) value = 0;
    onchange?.();
  }

  function increment(by = 1) {
    valueFly.y = -12;
    value += by;
    onchange?.();
  }
</script>

<div class="flex flex-col items-center self-start">
  <span class:font-bold={value}>{field.name}</span>
  {#if field.tip}
    <span class="text-xs font-light">{field.tip}</span>
  {/if}

  <div class="flex flex-col">
    <div class="flex gap-1">
      <Button onclick={() => increment()} class="h-12 w-16 justify-center active:-translate-y-0.5!">
        <PlusIcon class="text-theme" />
      </Button>
      {#each field.multiples as multiple}
        <Button
          onclick={() => increment(multiple)}
          class="h-12 w-16 justify-center gap-0! font-bold text-theme active:-translate-y-0.5!"
        >
          {multiple}
        </Button>
      {/each}
    </div>

    <div
      class={[
        "flex h-16 w-full items-center justify-center text-center",
        value > 0 ? "text-lg font-bold" : "text-sm font-light",
      ]}
    >
      {#key value}
        <span in:fly={valueFly}>{value}</span>
      {/key}
    </div>

    <div class="flex gap-1">
      <Button
        onclick={() => decrement()}
        disabled={field.allowNegative !== true && value < 1}
        class="w-16 justify-center"
      >
        <MinusIcon class="size-5" />
      </Button>
      {#each field.multiples as multiple}
        <Button
          onclick={() => decrement(multiple)}
          disabled={field.allowNegative !== true && value < 1}
          class="w-16 justify-center gap-0! text-sm font-light"
        >
          {multiple}
        </Button>
      {/each}
    </div>
  </div>
</div>
