<script lang="ts">
  import { page } from "$app/state";
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";

  let { data, children } = $props();

  const pageTitle = $derived(page.data.title);

  const routeBase = $derived(`survey/${data.survey.record.id}`);

  function getAnchorClass(matching: string) {
    return (
      "active:left-0! active:top-0.5 " + (pageTitle.toLowerCase() == matching ? "font-bold underline" : "font-light")
    );
  }
</script>

<div class="flex flex-col gap-4">
  <Header
    title="Admin - {data.compRecord.name} - {data.survey.record.name} - MeanScout"
    heading="Admin"
    subheading="{data.compRecord.name} - {data.survey.record.name}"
    backLink={localStorage.getItem("home") || `comp/${data.compRecord.id}`}
  />

  <div class="-m-1 flex gap-2 overflow-x-auto p-1 text-sm text-nowrap">
    <Anchor route={routeBase} class={getAnchorClass("general")}>General</Anchor>
    <Anchor route="{routeBase}/fields" class={getAnchorClass("fields")}>Fields</Anchor>
    <Anchor route="{routeBase}/preview" class={getAnchorClass("preview")}>Preview</Anchor>
    {#if data.survey.type == "match"}
      <Anchor route="{routeBase}/analysis" class={getAnchorClass("analysis")}>Analysis</Anchor>
    {/if}
    <Anchor route="{routeBase}/danger" class={getAnchorClass("danger zone")}>Danger Zone</Anchor>
  </div>
</div>

{@render children()}
