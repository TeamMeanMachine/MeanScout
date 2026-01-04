<script lang="ts">
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import type { SelectField } from "$lib/field";

  let {
    field,
    value = $bindable(),
    onchange = undefined,
  }: {
    field: SelectField;
    value: string;
    onchange?: (() => void) | undefined;
  } = $props();
</script>

{#if field.radio}
  <div class="flex flex-col self-start">
    <span>{field.name}</span>
    {#if field.tip}
      <span class="text-xs font-light">{field.tip}</span>
    {/if}
    <div class="flex flex-wrap gap-2">
      {#each field.values as val}
        <Button onclick={() => (value = val)}>
          {#if value == val}
            <CircleCheckBigIcon class="text-theme" />
          {:else}
            <CircleIcon class="text-theme" />
          {/if}
          <span class:font-bold={value == val}>{val}</span>
        </Button>
      {/each}
    </div>
  </div>
{:else}
  <label class="flex flex-col self-start">
    <span>{field.name}</span>
    {#if field.tip}
      <span class="text-xs font-light">{field.tip}</span>
    {/if}
    <select bind:value {onchange} class="bg-neutral-800 p-2 text-theme capitalize">
      {#each field.values as val}
        <option value={val}>{val}</option>
      {/each}
    </select>
  </label>
{/if}
