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

<label class="flex flex-col">
  {field.name}
  <select bind:value {onchange} class="bg-neutral-800 p-2 capitalize text-theme">
    {#each field.values as val}
      <option value={val}>{val}</option>
    {/each}
  </select>
</label>
