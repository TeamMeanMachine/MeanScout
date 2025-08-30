<script lang="ts">
  import { page } from "$app/state";
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";

  let { data, children } = $props();

  const pageTitle = $derived(page.data.title);

  const routeBase = $derived(`comp/${data.compRecord.id}/admin`);

  function getAnchorClass(matching: string) {
    return (
      "active:left-0! active:top-0.5 " + (pageTitle.toLowerCase() == matching ? "font-bold underline" : "font-light")
    );
  }

  function navBar(div: HTMLElement) {
    div.getElementsByClassName("font-bold")[0].scrollIntoView({ inline: "center" });
  }
</script>

<div class="flex flex-col gap-4">
  <Header
    title="Admin - {data.compRecord.name} - MeanScout"
    heading="Admin"
    subheading={data.compRecord.name}
    backLink={localStorage.getItem("home") || `comp/${data.compRecord.id}`}
  />

  <div use:navBar class="-m-1 flex gap-2 overflow-x-auto p-1 text-sm text-nowrap">
    <Anchor route={routeBase} class={getAnchorClass("general")}>General</Anchor>
    <Anchor route="{routeBase}/scouts" class={getAnchorClass("scouts")}>Scouts</Anchor>
    <Anchor route="{routeBase}/teams" class={getAnchorClass("teams")}>Teams</Anchor>
    <Anchor route="{routeBase}/matches" class={getAnchorClass("matches")}>Matches</Anchor>
    <Anchor route="{routeBase}/danger" class={getAnchorClass("danger zone")}>Danger Zone</Anchor>
  </div>
</div>

{@render children()}
