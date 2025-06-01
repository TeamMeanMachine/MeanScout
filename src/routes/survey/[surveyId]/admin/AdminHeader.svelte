<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    page,
  }: {
    surveyRecord: IDBRecord<Survey>;
    page: string;
  } = $props();

  const routeBase = `survey/${surveyRecord.id}/admin`;

  function getAnchorClass(matching: string) {
    return "active:left-0! active:top-0.5 " + (page == matching ? "font-bold underline" : "font-light");
  }

  function navBar(div: HTMLElement) {
    div.getElementsByClassName("font-bold")[0].scrollIntoView({ inline: "center" });
  }
</script>

<div class="flex flex-col gap-4">
  <Header
    title="Admin - {surveyRecord.name} - MeanScout"
    heading={[
      { type: "sm", text: surveyRecord.name },
      { type: "h1", text: "Admin" },
    ]}
    backLink="survey/{surveyRecord.id}"
  />

  <div
    use:navBar
    class="-m-1 flex gap-2 overflow-x-auto p-1 text-sm text-nowrap"
    style="view-transition-name:survey-header"
  >
    <Anchor route={routeBase} class={getAnchorClass("general")}>General</Anchor>
    <Anchor route="{routeBase}/fields" class={getAnchorClass("fields")}>Fields</Anchor>
    <Anchor route="{routeBase}/preview" class={getAnchorClass("preview")}>Preview</Anchor>
    {#if surveyRecord.type == "match"}
      <Anchor route="{routeBase}/analysis" class={getAnchorClass("analysis")}>Analysis</Anchor>
      <Anchor route="{routeBase}/scouts" class={getAnchorClass("scouts")}>Scouts</Anchor>
    {/if}
    <Anchor route="{routeBase}/matches" class={getAnchorClass("matches")}>Matches</Anchor>
    <Anchor route="{routeBase}/teams" class={getAnchorClass("teams")}>Teams</Anchor>
    <Anchor route="{routeBase}/danger" class={getAnchorClass("danger")}>Danger Zone</Anchor>
  </div>
</div>
