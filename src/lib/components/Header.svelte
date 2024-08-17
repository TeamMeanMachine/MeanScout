<script lang="ts">
  import { modeStore, targetStore } from "$lib/settings";
  import type { Snippet } from "svelte";
  import Anchor from "./Anchor.svelte";
  import Container from "./Container.svelte";
  import Icon from "./Icon.svelte";

  let {
    backLink = undefined,
    children = undefined,
  }: {
    backLink?: string | undefined;
    children?: Snippet | undefined;
  } = $props();
</script>

<header>
  <Container align="center">
    {#if backLink === undefined}
      <Container padding="small">
        <img src="./logo.svg" alt="" width="30" height="30" />
      </Container>
    {:else}
      <Anchor route={backLink}>
        <Container>
          <Icon name="arrow-left" />
        </Container>
      </Anchor>
    {/if}
    <Container direction="column" gap="none">
      {#if children}
        {@render children()}
      {:else}
        <h1>MeanScout</h1>
      {/if}
    </Container>
  </Container>

  <span>{$modeStore == "admin" ? "Admin" : $targetStore}</span>
</header>

<style>
  header {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--outer-gap);
    justify-content: space-between;
    min-height: 74px;
    padding: var(--outer-gap);
  }

  span {
    color: var(--theme-color);
    font-size: 16px;
    padding: var(--inner-gap);
    text-align: right;
    text-transform: capitalize;
  }
</style>
