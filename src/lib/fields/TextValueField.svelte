<script lang="ts">
  import type { TextField } from "$lib/field";

  let {
    field,
    value = $bindable(),
    onchange = undefined,
  }: {
    field: TextField;
    value: string;
    onchange?: (() => void) | undefined;
  } = $props();
</script>

<label class="flex w-full flex-col">
  <span>{field.name}</span>
  {#if field.tip}
    <span class="text-xs font-light">{field.tip}</span>
  {/if}
  {#if field.long}
    <textarea bind:value {onchange} class="h-72 resize-none bg-neutral-800 p-2 text-theme"> </textarea>
  {:else}
    <input bind:value {onchange} class="bg-neutral-800 p-2 text-theme" />
  {/if}
</label>
