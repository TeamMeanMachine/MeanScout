<script lang="ts">
  import type { Comp } from "$lib/comp";
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import type { Survey } from "$lib/survey";

  let {
    compRecord,
    surveyRecord,
    page,
    pageTitle,
  }: {
    compRecord: Comp;
    surveyRecord: Survey;
    page: string;
    pageTitle?: string;
  } = $props();

  const routeBase = $derived(`survey/${surveyRecord.id}`);

  const title = $derived(
    pageTitle
      ? `${pageTitle} - ${compRecord.name} - ${surveyRecord.name}`
      : `${compRecord.name} - ${surveyRecord.name}`,
  );

  const teamCount = $derived(
    surveyRecord.type == "pit"
      ? compRecord.teams.length
      : new Set([
          ...compRecord.matches.flatMap((match) => [
            match.red1,
            match.red2,
            match.red3,
            match.blue1,
            match.blue2,
            match.blue3,
          ]),
          ...compRecord.teams.map((team) => team.number),
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
    heading={[
      { type: "sm", text: compRecord.name },
      { type: "h1", text: surveyRecord.name },
    ]}
  />

  <div
    use:navBar
    class="-m-1 flex gap-2 overflow-x-auto p-1 text-sm text-nowrap"
    style="view-transition-name:survey-header"
  >
    <Anchor route={routeBase} class={getAnchorClass("overview")}>Overview</Anchor>
    <Anchor route="{routeBase}/entries" class={getAnchorClass("entries")}>Entries</Anchor>
    {#if surveyRecord.type == "match" && (surveyRecord.pickLists.length || surveyRecord.expressions.length)}
      <Anchor route="{routeBase}/analysis" class={getAnchorClass("analysis")}>Analysis</Anchor>
    {/if}
    {#if compRecord.matches.length}
      <Anchor route="{routeBase}/matches" class={getAnchorClass("matches")}>Matches</Anchor>
    {/if}
    {#if teamCount}
      <Anchor route="{routeBase}/teams" class={getAnchorClass("teams")}>Teams</Anchor>
    {/if}
    {#if surveyRecord.type == "match" && compRecord.scouts}
      <Anchor route="{routeBase}/predictions" class={getAnchorClass("predictions")}>Predictions</Anchor>
    {/if}
  </div>
</div>
