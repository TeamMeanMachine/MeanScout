<script lang="ts">
  import { sessionStorageStore, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import TeamDerivedDataTable from "$lib/components/TeamDerivedDataTable.svelte";
  import TeamRawDataTable from "$lib/components/TeamRawDataTable.svelte";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";

  let {
    pageData,
    team,
  }: {
    pageData: CompPageData;
    team: Team;
  } = $props();

  const hasDerived = pageData.surveyRecords.some(
    (s) => s.type == "match" && s.expressions.some((e) => e.scope == "entry"),
  );
  const whichData = sessionStorageStore<"derived" | "raw">("team-view-which-data", "derived");
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <div class="flex flex-col">
    <span class="font-bold">Team {team.number}</span>
    {#if team.name}
      <span class="text-xs font-light">{team.name}</span>
    {/if}
  </div>

  {#if hasDerived}
    <div class="flex gap-2 text-sm">
      <Button onclick={() => ($whichData = "derived")} class={$whichData == "derived" ? "font-bold" : "font-light"}>
        Derived
      </Button>
      <Button onclick={() => ($whichData = "raw")} class={$whichData == "raw" ? "font-bold" : "font-light"}>Raw</Button>
    </div>
  {/if}
</div>

<div class="flex max-h-[500px] flex-col overflow-auto">
  {#each pageData.surveyRecords.toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <h2 class="sticky left-0 font-bold not-first-of-type:mt-4">{surveyRecord.name}</h2>
    {#if $whichData == "derived" && surveyRecord.type == "match"}
      <TeamDerivedDataTable {pageData} {surveyRecord} {team} />
    {:else}
      <TeamRawDataTable {pageData} {surveyRecord} {team} />
    {/if}
  {/each}
</div>
