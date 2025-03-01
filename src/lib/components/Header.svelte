<script lang="ts">
  import type { Heading } from "$lib";
  import { modeStore, targetStore } from "$lib/settings";
  import Anchor from "./Anchor.svelte";
  import Icon from "./Icon.svelte";

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
    <Anchor route={backLink}>
      <Icon name="xmark" />
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
          <small>{text}</small>
        {/if}
      {/each}
    {/if}
  </div>

  <div class="flex flex-col text-right">
    {#if $modeStore == "admin"}
      <small>Admin</small>
    {/if}
    <small class="text-theme font-bold capitalize">{$targetStore}</small>
  </div>
</header>
