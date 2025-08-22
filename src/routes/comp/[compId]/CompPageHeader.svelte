<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import CompMenuDialog from "$lib/dialogs/CompMenuDialog.svelte";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";

  let {
    pageData,
    page,
    pageTitle,
  }: {
    pageData: CompPageData;
    page: string;
    pageTitle?: string;
  } = $props();

  const routeBase = $derived(`comp/${pageData.compRecord.id}`);

  const title = $derived(pageTitle ? `${pageTitle} - ${pageData.compRecord.name}` : `${pageData.compRecord.name}`);

  const showAnalysisLink = $derived(
    pageData.surveyRecords.some(
      (survey) => survey.type == "match" && (survey.pickLists.length || survey.expressions.length),
    ),
  );

  const teamCount = $derived(
    new Set([
      ...pageData.compRecord.matches.flatMap((match) => [
        match.red1,
        match.red2,
        match.red3,
        match.blue1,
        match.blue2,
        match.blue3,
      ]),
      ...pageData.compRecord.teams.map((team) => team.number),
    ]).size,
  );

  function getAnchorClass(matching: string) {
    return "active:left-0! active:top-0.5 " + (page == matching ? "font-bold underline" : "font-light");
  }

  function navBar(div: HTMLElement) {
    div.getElementsByClassName("font-bold")[0].scrollIntoView({ inline: "center" });
  }
</script>

<div class="flex flex-col gap-4">
  <Header
    title="{title} - MeanScout"
    heading={pageData.compRecord.name}
    onmenupressed={() => {
      openDialog(CompMenuDialog, { pageData });
    }}
  />

  <div
    use:navBar
    class="-m-1 flex gap-2 overflow-x-auto p-1 text-sm text-nowrap"
    style="view-transition-name:comp-header"
  >
    <Anchor route={routeBase} class={getAnchorClass("overview")}>Overview</Anchor>
    <Anchor route="{routeBase}/entries" class={getAnchorClass("entries")}>Entries</Anchor>
    {#if showAnalysisLink}
      <Anchor route="{routeBase}/analysis" class={getAnchorClass("analysis")}>Analysis</Anchor>
    {/if}
    {#if pageData.compRecord.matches.length}
      <Anchor route="{routeBase}/matches" class={getAnchorClass("matches")}>Matches</Anchor>
    {/if}
    {#if teamCount}
      <Anchor route="{routeBase}/teams" class={getAnchorClass("teams")}>Teams</Anchor>
    {/if}
    {#if pageData.compRecord.scouts}
      <Anchor route="{routeBase}/predictions" class={getAnchorClass("predictions")}>Predictions</Anchor>
    {/if}
  </div>
</div>
