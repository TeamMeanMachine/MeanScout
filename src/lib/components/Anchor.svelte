<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    route = "",
    class: classes = "",
    style,
    children,
  }: {
    route?: string;
    class?: string;
    style?: string;
    children: Snippet;
  } = $props();
</script>

<a href="#/{route}" class="flex flex-wrap items-center gap-2 bg-neutral-800 p-2 {classes}" {style}>
  {@render children()}
</a>
