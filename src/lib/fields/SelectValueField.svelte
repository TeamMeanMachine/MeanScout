<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
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
    <span class="font-light">{field.name}</span>
    <div class="flex flex-wrap gap-2">
      {#each field.values as val}
        <Button onclick={() => (value = val)}>
          {#if value == val}
            <Icon name="circle-dot" />
            <strong>{val}</strong>
          {:else}
            <Icon style="regular" name="circle" />
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
