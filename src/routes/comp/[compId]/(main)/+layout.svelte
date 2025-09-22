<script lang="ts">
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

  const showRanksLink = $derived(
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
    // because they have fixed positions when `max-lg`.

    if (currentScrollY == 0 || differenceFromStart < -100) {
      bottomNav.classList.remove("-bottom-20!");
    } else if (differenceFromStart > 0) {
      bottomNav.classList.add("-bottom-20!");
    }

    lastScrollY = currentScrollY;
  }

  function getAnchorClass(matching: string) {
    return (
      "grow items-center flex-nowrap! justify-center active:translate-x-0! active:translate-y-0.5 " +
      "max-lg:gap-1 max-lg:py-1 max-lg:flex-col " +
      (pageTitle.toLowerCase() == matching ? "font-bold underline" : "font-light")
    );
  }
</script>

<svelte:window {onscroll} />

<svelte:head>
  <title>{title} - MeanScout</title>
</svelte:head>

<Header
  title="{title} - MeanScout"
  heading={data.compRecord.name}
  onmenupressed={() => {
    openDialog(CompMenuDialog, { pageData: data });
  }}
>
  <div class="hidden max-w-(--breakpoint-lg) gap-2 text-sm text-nowrap lg:flex">
    {@render links()}
  </div>
</Header>

<div class="mx-auto my-3 flex w-full max-w-(--breakpoint-lg) grow flex-col gap-6 p-3">
  {@render children()}
</div>

<div
  bind:this={bottomNav}
  class="sticky bottom-0 left-0 z-20 w-full gap-0 overflow-x-auto border-t border-neutral-600 bg-neutral-800 text-nowrap transition-[bottom] lg:hidden"
  style="scrollbar-width:none"
>
  <div class="mx-auto flex max-w-xl gap-0 p-1 text-sm">
    {@render links()}
  </div>
</div>

{#snippet links()}
  <Anchor route={routeBase} class={getAnchorClass("entries")}>
    <NotepadTextIcon class="text-theme" />
    Entries
  </Anchor>
  {#if data.compRecord.matches.length}
    <Anchor route="{routeBase}/matches" class={getAnchorClass("matches")}>
      <ListOrderedIcon class="text-theme" />
      Matches
    </Anchor>
  {/if}
  {#if teamCount}
    <Anchor route="{routeBase}/teams" class={getAnchorClass("teams")}>
      <UsersIcon class="text-theme" />
      Teams
    </Anchor>
  {/if}
  {#if showRanksLink}
    <Anchor route="{routeBase}/ranks" class={getAnchorClass("ranks")}>
      <ChartBarBigIcon class="text-theme" />
      Ranks
    </Anchor>
  {/if}
  {#if data.compRecord.scouts}
    <Anchor route="{routeBase}/guesses" class={getAnchorClass("guesses")}>
      <DicesIcon class="text-theme" />
      Guesses
    </Anchor>
  {/if}
{/snippet}
