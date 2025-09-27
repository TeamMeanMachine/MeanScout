<script lang="ts">
  import { targetStore } from "$lib/settings";
  import { EllipsisVerticalIcon, XIcon } from "@lucide/svelte";
  import Anchor from "./Anchor.svelte";
  import Button from "./Button.svelte";
  import type { Snippet } from "svelte";

  let {
    title = "MeanScout",
    heading = "MeanScout",
    subheading,
    backLink,
    onmenupressed,
    children,
  }: {
    title?: string;
    heading?: string;
    subheading?: string;
    backLink?: string;
    onmenupressed?: () => void;
    children?: Snippet;
  } = $props();
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<header class="sticky top-0 left-0 z-20 flex flex-col border-b border-neutral-600 bg-neutral-900 py-2 transition-[top]">
  <div class="mx-auto flex min-h-10 w-full items-center justify-between gap-3 px-3">
    <div class="flex grow basis-60 gap-2">
      <img src="./logo.svg" alt="" width="25" height="25" />

      <div class="flex grow flex-col truncate">
        {#if subheading}
          <span class="text-xs font-light">{subheading}</span>
        {/if}
        <h1 class="font-bold">{heading}</h1>
      </div>
    </div>

    {@render children?.()}

    <div class="flex shrink grow basis-60 items-center gap-3">
      <span class="text-theme grow truncate text-right text-sm font-bold capitalize">{$targetStore}</span>

      {#if onmenupressed}
        <Button onclick={onmenupressed}>
          <EllipsisVerticalIcon class="text-theme" />
        </Button>
      {:else if backLink !== undefined}
        <Anchor route={backLink}>
          <XIcon class="text-theme" />
        </Anchor>
      {/if}
    </div>
  </div>
</header>
