<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import type { ToggleField } from "$lib/field";
  import { SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";

  let {
    field,
    value = $bindable(),
    onchange = undefined,
  }: {
    field: ToggleField;
    value: boolean;
    onchange?: (() => void) | undefined;
  } = $props();

  function toggle() {
    value = !value;
    onchange && onchange();
  }
</script>

<div class="flex flex-col">
  <Button onclick={toggle} class="self-start">
    {#if value}
      <SquareCheckBigIcon class="text-theme" />
      <strong>{field.name}</strong>
    {:else}
      <SquareIcon class="text-theme" />
      {field.name}
    {/if}
  </Button>
  {#if field.tip}
    <small class="pt-1">{field.tip}</small>
  {/if}
</div>
