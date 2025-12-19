<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";

  let {
    type = "button",
    // Extracting class prevents overriding the combined class prop
    class: classes,
    children,
    ...args
  }: HTMLButtonAttributes = $props();
</script>

<button {type} class={["flex items-center gap-2 bg-neutral-800 p-2 text-left", classes]} {...args}>
  {@render children?.()}
</button>
