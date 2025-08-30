<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import CompMenuDialog from "$lib/dialogs/CompMenuDialog.svelte";
  import { ChartBarBigIcon, DicesIcon, ListOrderedIcon, NotepadTextIcon, UsersIcon } from "@lucide/svelte";

  let { data, children } = $props();

  const pageTitle = $derived(page.data.title);
  const title = $derived(pageTitle ? `${pageTitle} - ${data.compRecord.name}` : `${data.compRecord.name}`);

  const routeBase = $derived(`comp/${data.compRecord.id}`);

  const showAnalysisLink = $derived(
    data.surveyRecords.some(
      (survey) => survey.type == "match" && (survey.pickLists.length || survey.expressions.length),
    ),
  );

  const teamCount = $derived(
    new Set([
      ...data.compRecord.matches.flatMap((match) => [
        match.red1,
        match.red2,
        match.red3,
        match.blue1,
        match.blue2,
        match.blue3,
      ]),
      ...data.compRecord.teams.map((team) => team.number),
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
      topNav.classList.remove("top-[-57px]!");
      bottomNav.classList.remove("-bottom-20!");
    } else if (differenceFromStart > scrollThreshold) {
      topNav.classList.add("top-[-57px]!");
      bottomNav.classList.add("-bottom-20!");
    }

    lastScrollY = currentScrollY;
  }

  function getAnchorClass(matching: string) {
    return (
      "items-center justify-center active:left-0! active:top-0.5 " +
      "max-md:gap-1 max-md:py-1 max-md:flex-col max-md:grow " +
      (pageTitle.toLowerCase() == matching ? "font-bold underline" : "font-light")
    );
  }

  afterNavigate(() => {
    bottomNav.getElementsByClassName("font-bold")[0].scrollIntoView({ inline: "center", block: "nearest" });
  });
</script>

<svelte:window {onscroll} />

<div class="flex flex-col gap-2">
  <div
    bind:this={topNav}
    class={[
      "fixed top-0 left-0 z-20 w-full grow border-b border-neutral-600 bg-neutral-900 px-3 py-2 transition-[top]",
      "md:static md:border-none md:p-0",
    ]}
  >
    <Header
      title="{title} - MeanScout"
      heading={data.compRecord.name}
      onmenupressed={() => {
        openDialog(CompMenuDialog, { pageData: data });
      }}
    />
  </div>

  <div
    bind:this={bottomNav}
    class={[
      "fixed bottom-0 left-0 z-20 w-full gap-0 overflow-x-auto border-t border-neutral-600 bg-neutral-800 text-xs text-nowrap transition-[bottom]",
      "md:static md:overflow-visible md:border-none md:bg-neutral-900  md:text-sm",
    ]}
    style="scrollbar-width:none"
  >
    <div class="mx-auto flex max-w-xl gap-0 p-1 md:mx-0 md:max-w-full md:gap-2 md:p-0">
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
      {#if data.compRecord.matches.length}
        <Anchor route="{routeBase}/matches" class={getAnchorClass("matches")}>
          <ListOrderedIcon class="text-theme" />
          Matches
        </Anchor>
      {/if}
      {#if data.compRecord.scouts}
        <Anchor route="{routeBase}/predictions" class={getAnchorClass("predictions")}>
          <DicesIcon class="text-theme" />
          Predictions
        </Anchor>
      {/if}
    </div>
  </div>
</div>

{@render children()}
