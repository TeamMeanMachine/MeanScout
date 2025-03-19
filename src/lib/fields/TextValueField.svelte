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
    <small class="font-light">{field.tip}</small>
  {/if}
  {#if field.long}
    <textarea bind:value {onchange} class="text-theme h-72 resize-none bg-neutral-800 p-2"> </textarea>
  {:else}
    <input bind:value {onchange} class="text-theme bg-neutral-800 p-2" />
  {/if}
</label>
