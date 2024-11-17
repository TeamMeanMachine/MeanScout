<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
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
  {field.name}
  <div class="flex flex-wrap">
    {#each Array(5) as _, i}
      <Button onclick={() => rate(i)} class="px-1.5">
        <Icon style={value > i ? "solid" : "regular"} name="star" />
      </Button>
    {/each}
  </div>
  {#if field.tip}
    <small class="pt-1">{field.tip}</small>
  {/if}
</div>
