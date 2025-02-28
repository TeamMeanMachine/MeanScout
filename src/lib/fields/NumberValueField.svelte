<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { NumberField } from "$lib/field";

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
  {field.name}
  <div class="flex flex-wrap">
    <Button onclick={increment}>
      <Icon name="plus" />
    </Button>
    <span class="w-12 bg-neutral-800 p-2 text-center">{value}</span>
    <Button onclick={decrement} disabled={field.allowNegative !== true && value < 1}>
      <Icon name="minus" />
    </Button>
  </div>
  {#if field.tip}
    <small class="pt-1">{field.tip}</small>
  {/if}
</div>
