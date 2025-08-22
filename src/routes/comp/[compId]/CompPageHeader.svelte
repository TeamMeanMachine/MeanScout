<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import CompMenuDialog from "$lib/dialogs/CompMenuDialog.svelte";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";
  import { ChartBarBigIcon, DicesIcon, HomeIcon, ListOrderedIcon, NotepadTextIcon, UsersIcon } from "@lucide/svelte";

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
    return (
      "items-center justify-center max-md:py-1 max-md:flex-col max-md:grow active:left-0! active:top-0.5 " +
      (page == matching ? "font-bold underline" : "font-light")
    );
  }

  function navBar(div: HTMLElement) {
    div.getElementsByClassName("font-bold")[0].scrollIntoView({ inline: "center" });
  }
</script>

<div class="flex flex-col gap-2">
  <div
    class="border-neutral-600 max-md:fixed max-md:top-0 max-md:left-0 max-md:z-20 max-md:w-full max-md:gap-0 max-md:overflow-x-auto max-md:border-b max-md:bg-neutral-900 max-md:px-3 max-md:py-2"
  >
    <Header
      title="{title} - MeanScout"
      heading={pageData.compRecord.name}
      onmenupressed={() => {
        openDialog(CompMenuDialog, { pageData });
      }}
    />
  </div>

  <div
    use:navBar
    class={[
      "flex gap-2 border-neutral-600 text-sm text-nowrap",
      "max-md:fixed max-md:bottom-0 max-md:left-0 max-md:z-20 max-md:w-full max-md:gap-0 max-md:overflow-x-auto max-md:border-t max-md:bg-neutral-800 max-md:p-1",
    ]}
    style="view-transition-name:comp-header;scrollbar-width:none"
  >
    <Anchor route={routeBase} class={getAnchorClass("overview")}>
      <HomeIcon class="text-theme md:hidden" />
      Overview
    </Anchor>
    <Anchor route="{routeBase}/entries" class={getAnchorClass("entries")}>
      <NotepadTextIcon class="text-theme md:hidden" />
      Entries
    </Anchor>
    {#if showAnalysisLink}
      <Anchor route="{routeBase}/analysis" class={getAnchorClass("analysis")}>
        <ChartBarBigIcon class="text-theme md:hidden" />
        Analysis
      </Anchor>
    {/if}
    {#if pageData.compRecord.matches.length}
      <Anchor route="{routeBase}/matches" class={getAnchorClass("matches")}>
        <ListOrderedIcon class="text-theme md:hidden" />
        Matches
      </Anchor>
    {/if}
    {#if teamCount}
      <Anchor route="{routeBase}/teams" class={getAnchorClass("teams")}>
        <UsersIcon class="text-theme md:hidden" />
        Teams
      </Anchor>
    {/if}
    {#if pageData.compRecord.scouts}
      <Anchor route="{routeBase}/predictions" class={getAnchorClass("predictions")}>
        <DicesIcon class="text-theme md:hidden" />
        Predictions
      </Anchor>
    {/if}
  </div>
</div>
