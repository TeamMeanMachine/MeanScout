<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import type { RatingField } from "$lib/field";
  import { StarIcon } from "@lucide/svelte";

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
    <small class="font-light">{field.tip}</small>
  {/if}
  <div class="flex flex-wrap">
    {#each Array(5) as _, i}
      <Button onclick={() => rate(i)} class="active:top-0! {value > i ? 'active:-left-0.5' : 'active:left-0.5'}">
        <StarIcon class="text-theme" fill={value > i ? "currentColor" : "transparent"} />
      </Button>
    {/each}
  </div>
</div>
