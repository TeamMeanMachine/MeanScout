<script lang="ts">
  import type { HTMLAnchorAttributes } from "svelte/elements";

  let {
    route = "",
    // Extracting class prevents overriding the combined class prop
    class: classes,
    // Extracting href prevents overriding the custom hash route prop
    href,
    children,
    ...args
  }: {
    route?: string;
  } & HTMLAnchorAttributes = $props();
</script>

<a href="/#/{route.replace('#/', '')}" class={["flex items-center gap-2 bg-neutral-800 p-2", classes]} {...args}>
  {@render children?.()}
</a>
