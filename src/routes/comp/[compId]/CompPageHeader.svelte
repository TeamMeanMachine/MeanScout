<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import CompMenuDialog from "$lib/dialogs/CompMenuDialog.svelte";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";
  import { ChartBarBigIcon, DicesIcon, ListOrderedIcon, NotepadTextIcon, UsersIcon } from "@lucide/svelte";

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

  // Distance we have to scroll in one direction to hide/show navs on mobile.
  const scrollThreshold = 100;

  let topNav: HTMLElement;
  let bottomNav: HTMLElement;

  let lastScrollY = $state(0);
  let scrollStart = $state(0);
  let lastScrollDir = $state(0);

  function onscroll() {
    const currentScrollY = window.scrollY;
    const currentScrollDir = Math.sign(currentScrollY - lastScrollY);

    if (currentScrollDir !== lastScrollDir) {
      scrollStart = currentScrollY;
      lastScrollDir = currentScrollDir;
    }

    const differenceFromStart = currentScrollY - scrollStart;

    // We always want to see the nav at the very top of the page.
    // Otherwise, if the tracked scroll difference reaches the threshold,
    // then toggle navs based on the direction.

    // And yes, we're actually moving them outside the viewport.
    // This does not cause a content overflow,
    // because they have fixed positions when `max-md`.

    if (currentScrollY == 0 || differenceFromStart < -scrollThreshold) {
      topNav.classList.remove("max-md:top-[-57px]");
      bottomNav.classList.remove("max-md:-bottom-20!");
    } else if (differenceFromStart > scrollThreshold) {
      topNav.classList.add("max-md:top-[-57px]");
      bottomNav.classList.add("max-md:-bottom-20!");
    }

    lastScrollY = currentScrollY;
  }

  function getAnchorClass(matching: string) {
    return (
      "items-center justify-center active:left-0! active:top-0.5 " +
      "max-md:gap-1 max-md:py-1 max-md:flex-col max-md:grow " +
      (page == matching ? "font-bold underline" : "font-light")
    );
  }

  function navBar(div: HTMLElement) {
    div.getElementsByClassName("font-bold")[0].scrollIntoView({ inline: "center" });
  }
</script>

<svelte:window {onscroll} />

<div class="flex flex-col gap-2">
  <div
    bind:this={topNav}
    class={[
      "grow border-neutral-600 transition-[top]",
      "max-md:fixed max-md:top-0 max-md:left-0 max-md:z-20 max-md:w-full max-md:overflow-x-auto max-md:border-b max-md:bg-neutral-900 max-md:px-3 max-md:py-2",
    ]}
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
    bind:this={bottomNav}
    use:navBar
    class={[
      "flex gap-2 border-neutral-600 text-sm text-nowrap transition-[bottom]",
      "max-md:fixed max-md:bottom-0 max-md:left-0 max-md:z-20 max-md:w-full max-md:gap-0 max-md:overflow-x-auto max-md:border-t max-md:bg-neutral-800 max-md:p-1 max-md:text-xs",
    ]}
    style="view-transition-name:comp-header;scrollbar-width:none"
  >
    <Anchor route={routeBase} class={getAnchorClass("entries")}>
      <NotepadTextIcon class="text-theme" />
      Entries
    </Anchor>
    {#if showAnalysisLink}
      <Anchor route="{routeBase}/analysis" class={getAnchorClass("analysis")}>
        <ChartBarBigIcon class="text-theme" />
        Analysis
      </Anchor>
    {/if}
    {#if teamCount}
      <Anchor route="{routeBase}/teams" class={getAnchorClass("teams")}>
        <UsersIcon class="text-theme" />
        Teams
      </Anchor>
    {/if}
    {#if pageData.compRecord.matches.length}
      <Anchor route="{routeBase}/matches" class={getAnchorClass("matches")}>
        <ListOrderedIcon class="text-theme" />
        Matches
      </Anchor>
    {/if}
    {#if pageData.compRecord.scouts}
      <Anchor route="{routeBase}/predictions" class={getAnchorClass("predictions")}>
        <DicesIcon class="text-theme" />
        Predictions
      </Anchor>
    {/if}
  </div>
</div>
