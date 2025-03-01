<script lang="ts">
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

<label class="flex flex-col self-start">
  {field.name}
  <select bind:value {onchange} class="text-theme bg-neutral-800 p-2 capitalize">
    {#each field.values as val}
      <option value={val}>{val}</option>
    {/each}
  </select>
  {#if field.tip}
    <small class="pt-1">{field.tip}</small>
  {/if}
</label>
