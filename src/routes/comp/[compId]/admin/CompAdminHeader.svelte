<script lang="ts">
  import type { Comp } from "$lib/comp";
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";

  let {
    compRecord,
    page,
  }: {
    compRecord: Comp;
    page: string;
  } = $props();

  const routeBase = `comp/${compRecord.id}/admin`;

  function getAnchorClass(matching: string) {
    return "active:left-0! active:top-0.5 " + (page == matching ? "font-bold underline" : "font-light");
  }

  function navBar(div: HTMLElement) {
    div.getElementsByClassName("font-bold")[0].scrollIntoView({ inline: "center" });
  }
</script>

<div class="flex flex-col gap-4">
  <Header
    title="Admin - {compRecord.name} - MeanScout"
    heading="Admin"
    subheading={compRecord.name}
    backLink={localStorage.getItem("home") || `comp/${compRecord.id}`}
  />

  <div
    use:navBar
    class="-m-1 flex gap-2 overflow-x-auto p-1 text-sm text-nowrap"
    style="view-transition-name:comp-header"
  >
    <Anchor route={routeBase} class={getAnchorClass("general")}>General</Anchor>
    <Anchor route="{routeBase}/scouts" class={getAnchorClass("scouts")}>Scouts</Anchor>
    <Anchor route="{routeBase}/teams" class={getAnchorClass("teams")}>Teams</Anchor>
    <Anchor route="{routeBase}/matches" class={getAnchorClass("matches")}>Matches</Anchor>
    <Anchor route="{routeBase}/danger" class={getAnchorClass("danger")}>Danger Zone</Anchor>
  </div>
</div>
