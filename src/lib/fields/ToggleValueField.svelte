<script lang="ts">
  import { SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import type { ToggleField } from "$lib/field";

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
    {:else}
      <SquareIcon class="text-theme" />
    {/if}
    <div class="flex flex-col">
      <span class:font-bold={value}>{field.name}</span>
      {#if field.tip}
        <span class="text-xs font-light">{field.tip}</span>
      {/if}
    </div>
  </Button>
</div>
