<script lang="ts">
  import { type Team } from "$lib";
  import TeamEntryTable from "$lib/components/TeamEntryTable.svelte";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";

  let {
    pageData,
    team,
  }: {
    pageData: CompPageData;
    team: Team;
  } = $props();
</script>

<div class="flex flex-col">
  <span class="font-bold">Team {team.number}</span>
  {#if team.name}
    <span class="text-xs font-light">{team.name}</span>
  {/if}
</div>

<div class="flex max-h-[500px] flex-col overflow-auto">
  {#each pageData.surveyRecords.toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <h2 class="sticky left-0 font-bold not-first-of-type:mt-4">{surveyRecord.name}</h2>
    <TeamEntryTable {pageData} {surveyRecord} {team} />
  {/each}
</div>
