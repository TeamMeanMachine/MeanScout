<script lang="ts">
  import type { Heading } from "$lib";
  import { targetStore } from "$lib/settings";
  import { XIcon } from "@lucide/svelte";
  import Anchor from "./Anchor.svelte";

  let {
    title = "MeanScout",
    heading = "MeanScout",
    backLink,
  }: {
    title?: string;
    heading?: Heading;
    backLink?: string;
  } = $props();
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<header class="flex min-h-11 items-center gap-3" style="view-transition-name:header">
  {#if backLink === undefined}
    <img src="./logo.svg" alt="" width="25" height="25" />
  {:else}
    <Anchor route={backLink} class="active:-left-0.5!">
      <XIcon class="text-theme" />
    </Anchor>
  {/if}

  <div class="flex grow flex-col">
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

  <span class="text-theme text-sm font-bold capitalize">{$targetStore}</span>
</header>
