<script lang="ts">
  import { page } from "$app/state";
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import type { Snippet } from "svelte";

  let {
    children,
  }: {
    children: Snippet;
  } = $props();

  function getFontWeight(matching: string) {
    return page.route.id?.endsWith(matching) ? "font-bold" : "font-light";
  }
</script>

<Header
  title="Admin - {page.data.surveyRecord.id} - MeanScout"
  heading={[
    { type: "sm", text: page.data.surveyRecord.name },
    { type: "h1", text: "Admin" },
  ]}
  backLink="survey/{page.data.surveyRecord.id}"
/>

<div class="flex flex-wrap gap-2">
  <Anchor route="survey/{page.data.surveyRecord.id}/admin" class={getFontWeight("/admin")}>Options</Anchor>
  <Anchor route="survey/{page.data.surveyRecord.id}/admin/fields" class={getFontWeight("/fields")}>Fields</Anchor>
  {#if page.data.surveyType == "match"}
    <Anchor route="survey/{page.data.surveyRecord.id}/admin/analysis" class={getFontWeight("/analysis")}>
      Analysis
    </Anchor>
    <Anchor route="survey/{page.data.surveyRecord.id}/admin/matches" class={getFontWeight("/matches")}>Matches</Anchor>
  {/if}
  <Anchor route="survey/{page.data.surveyRecord.id}/admin/teams" class={getFontWeight("/teams")}>Teams</Anchor>
</div>

{@render children()}
