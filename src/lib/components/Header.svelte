<script lang="ts">
  import type { Heading } from "$lib";
  import { targetStore } from "$lib/settings";
  import { MenuIcon, XIcon } from "@lucide/svelte";
  import Anchor from "./Anchor.svelte";
  import Button from "./Button.svelte";

  let {
    title = "MeanScout",
    heading = "MeanScout",
    backLink,
    onmenupressed,
  }: {
    title?: string;
    heading?: Heading;
    backLink?: string;
    onmenupressed?: () => void;
  } = $props();
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<header class="flex h-10 items-center gap-3" style="view-transition-name:header">
  <div class="flex grow gap-2">
    <img src="./logo.svg" alt="" width="25" height="25" />

    <div class="flex flex-col">
      {#if typeof heading == "string"}
        <h1 class="font-bold">{heading}</h1>
      {:else}
        {#each heading as { type, text }}
          {#if type == "h1"}
            <h1 class="font-bold">{text}</h1>
          {:else if type == "sm"}
            <span class="text-xs font-light">{text}</span>
          {/if}
        {/each}
      {/if}
    </div>
  </div>

  <span class="text-theme text-sm font-bold capitalize">{$targetStore}</span>

  {#if onmenupressed}
    <Button onclick={onmenupressed}>
      <MenuIcon class="text-theme" />
    </Button>
  {:else if backLink !== undefined}
    <Anchor route={backLink} class="active:top-0.5 active:left-0!">
      <XIcon class="text-theme" />
    </Anchor>
  {/if}
</header>
