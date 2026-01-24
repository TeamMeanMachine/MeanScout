<script lang="ts">
  import { ChevronsLeftRightEllipsisIcon, EllipsisVerticalIcon, XIcon } from "@lucide/svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import Anchor from "./Anchor.svelte";
  import Button from "./Button.svelte";

  let {
    title = "MeanScout",
    heading = "MeanScout",
    subheading,
    backLink,
    onmenupressed,
    class: classes,
    children,
  }: {
    title?: string;
    heading?: string;
    subheading?: string;
    backLink?: string;
    onmenupressed?: () => void;
    class?: ClassValue;
    children?: Snippet;
  } = $props();
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<header class="fixed top-0 right-0 left-0 z-20 flex w-full flex-col border-b border-neutral-600 bg-neutral-900 py-2">
  <div class={["mx-auto flex min-h-10 w-full items-center gap-6 px-3", classes]}>
    <div class="flex gap-2">
      <img src="./logo.svg" alt="" width="25" height="25" />

      <div class="flex flex-col truncate">
        {#if subheading}
          <span class="truncate text-xs font-light">{subheading}</span>
        {/if}
        <h1 class="truncate font-bold">{heading}</h1>
      </div>
    </div>

    {@render children?.()}

    <div class="flex grow items-center justify-end gap-3">
      {#if onlineTransfer.localId}
        <Anchor route="webrtc" class="relative">
          <ChevronsLeftRightEllipsisIcon class="animate-pulse" />
          <span class="absolute right-0.5 bottom-0 text-xs font-light tracking-tighter italic">
            {onlineTransfer.clients.size - 1 || "!"}
          </span>
        </Anchor>
      {/if}

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
