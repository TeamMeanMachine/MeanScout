<script lang="ts">
  import { modeStore, targetStore } from "$lib/settings";
  import type { Snippet } from "svelte";
  import Anchor from "./Anchor.svelte";
  import Icon from "./Icon.svelte";

  let {
    backLink = undefined,
    children = undefined,
  }: {
    backLink?: string | undefined;
    children?: Snippet | undefined;
  } = $props();
</script>

<header class="flex min-h-[70px] items-center gap-3 p-3">
  {#if backLink === undefined}
    <img src="./logo.svg" alt="" width="25" height="25" />
  {:else}
    <Anchor route={backLink}>
      <Icon name="arrow-left" />
    </Anchor>
  {/if}

  <div class="flex grow flex-col">
    {#if children}
      {@render children()}
    {:else}
      <h1 class="font-bold">MeanScout</h1>
    {/if}
  </div>

  <div class="flex flex-col text-right">
    {#if $modeStore == "admin"}
      <small>Admin</small>
    {/if}
    <small class="font-bold capitalize text-theme">{$targetStore}</small>
  </div>
</header>
