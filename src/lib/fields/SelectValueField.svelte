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
    <span class="font-light">{field.name}</span>
    <div class="flex flex-wrap gap-2">
      {#each field.values as val}
        <Button onclick={() => (value = val)}>
          {#if value == val}
            <CircleCheckBigIcon class="text-theme" />
            <strong>{val}</strong>
          {:else}
            <CircleIcon class="text-theme" />
            {val}
          {/if}
        </Button>
      {/each}
    </div>
    {#if field.tip}
      <small class="pt-1">{field.tip}</small>
    {/if}
  </div>
{:else}
  <label class="flex flex-col self-start">
    <span class="font-light">{field.name}</span>
    <select bind:value {onchange} class="text-theme bg-neutral-800 p-2 capitalize">
      {#each field.values as val}
        <option value={val}>{val}</option>
      {/each}
    </select>
    {#if field.tip}
      <small class="pt-1">{field.tip}</small>
    {/if}
  </label>
{/if}
