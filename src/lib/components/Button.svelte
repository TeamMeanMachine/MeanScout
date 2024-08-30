<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  let {
    disabled = false,
    onclick,
    classes = "",
    children,
  }: {
    disabled?: boolean;
    onclick?: HTMLButtonAttributes["onclick"];
    classes?: string;
    children: Snippet;
  } = $props();
</script>

<button {onclick} {disabled} class="flex flex-wrap items-center gap-2 bg-neutral-800 p-2 text-left {classes}">
  {@render children()}
</button>
