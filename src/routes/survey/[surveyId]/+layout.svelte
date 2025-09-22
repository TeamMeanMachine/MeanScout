<script lang="ts">
  import { page } from "$app/state";
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";

  let { data, children } = $props();

  const pageTitle = $derived(page.data.title);

  const routeBase = $derived(`survey/${data.survey.record.id}`);

  function getAnchorClass(matching: string) {
    return (
      "active:translate-x-0! active:translate-y-0.5 " +
      (pageTitle.toLowerCase() == matching ? "font-bold underline" : "font-light")
    );
  }
</script>

<Header
  title="Admin - {data.compRecord.name} - {data.survey.record.name} - MeanScout"
  heading="Admin"
  subheading="{data.compRecord.name} - {data.survey.record.name}"
  backLink={localStorage.getItem("home") || `comp/${data.compRecord.id}`}
>
  <div class="hidden gap-2 text-sm text-nowrap lg:flex">
    {@render links()}
  </div>
</Header>

<div class="mx-auto my-3 flex w-full max-w-(--breakpoint-lg) grow flex-col gap-6 p-3">
  <div class="-m-1 flex gap-2 overflow-x-auto p-1 text-sm text-nowrap lg:hidden">
    {@render links()}
  </div>

  {@render children()}
</div>

{#snippet links()}
  <Anchor route={routeBase} class={getAnchorClass("general")}>General</Anchor>
  <Anchor route="{routeBase}/fields" class={getAnchorClass("fields")}>Fields</Anchor>
  <Anchor route="{routeBase}/preview" class={getAnchorClass("preview")}>Preview</Anchor>
  {#if data.survey.type == "match"}
    <Anchor route="{routeBase}/ranks" class={getAnchorClass("ranks")}>Ranks</Anchor>
  {/if}
  <Anchor route="{routeBase}/danger" class={getAnchorClass("danger zone")}>Danger Zone</Anchor>
{/snippet}
