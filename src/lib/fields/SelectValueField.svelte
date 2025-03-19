<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import type { SelectField } from "$lib/field";
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";

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
      <small class="font-light">{field.tip}</small>
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
      <small class="font-light">{field.tip}</small>
    {/if}
    <select bind:value {onchange} class="text-theme bg-neutral-800 p-2 capitalize">
      {#each field.values as val}
        <option value={val}>{val}</option>
      {/each}
    </select>
  </label>
{/if}
