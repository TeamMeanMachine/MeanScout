<script lang="ts">
  import { StarIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import type { RatingField } from "$lib/field";

  let {
    field,
    value = $bindable(),
    onchange = undefined,
  }: {
    field: RatingField;
    value: number;
    onchange?: (() => void) | undefined;
  } = $props();

  function rate(i: number) {
    if (value == i + 1) {
      value = 0;
    } else {
      value = i + 1;
    }
    onchange && onchange();
  }
</script>

<div class="flex flex-col">
  <span>{field.name}</span>
  {#if field.tip}
    <span class="text-xs font-light">{field.tip}</span>
  {/if}
  <div class="flex flex-wrap">
    {#each Array(5) as _, i}
      <Button onclick={() => rate(i)} class="group active:translate-none!">
        <StarIcon
          class="text-theme transition-transform group-active:translate-y-0.5"
          fill={value > i ? "currentColor" : "transparent"}
        />
      </Button>
    {/each}
  </div>
</div>
