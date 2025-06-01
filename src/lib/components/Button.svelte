<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  let {
    type = "button",
    disabled = false,
    onclick,
    class: classes = "",
    style,
    children,
  }: {
    type?: HTMLButtonAttributes["type"];
    disabled?: boolean;
    onclick?: HTMLButtonAttributes["onclick"];
    class?: string;
    style?: string;
    children: Snippet;
  } = $props();
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="flex flex-wrap items-center gap-2 bg-neutral-800 p-2 text-left {classes}"
  {style}
>
  {@render children()}
</button>
