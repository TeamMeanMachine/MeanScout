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
  <span class="font-light">{field.name}</span>
  {#if field.long}
    <textarea bind:value {onchange} class="text-theme h-72 resize-none bg-neutral-800 p-2"> </textarea>
  {:else}
    <input bind:value {onchange} class="text-theme bg-neutral-800 p-2" />
  {/if}
  {#if field.tip}
    <small class="pt-1">{field.tip}</small>
  {/if}
</label>
