<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    route = "",
    class: classes = "",
    children,
  }: {
    route?: string;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<a href="#/{route}" class="flex flex-wrap items-center gap-2 bg-neutral-800 p-2 {classes}">
  {@render children()}
</a>
