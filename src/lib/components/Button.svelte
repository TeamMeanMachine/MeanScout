<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  let {
    type = "button",
    disabled = false,
    onclick,
    classes = "",
    children,
  }: {
    type?: HTMLButtonAttributes["type"];
    disabled?: boolean;
    onclick?: HTMLButtonAttributes["onclick"];
    classes?: string;
    children: Snippet;
  } = $props();
</script>

<button {type} {disabled} {onclick} class="flex flex-wrap items-center gap-2 bg-neutral-800 p-2 text-left {classes}">
  {@render children()}
</button>
