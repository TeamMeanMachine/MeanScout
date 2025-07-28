<script lang="ts">
  import { type Team } from "$lib";
  import TeamEntryTable from "$lib/components/TeamEntryTable.svelte";
  import type { SurveyPageData } from "$lib/loaders/loadSurveyPageData";

  let {
    pageData,
    team,
  }: {
    pageData: SurveyPageData;
    team: Team;
  } = $props();
</script>

<div class="flex flex-col">
  <span class="font-bold">Team {team.number}</span>
  {#if team.name}
    <span class="text-xs font-light">{team.name}</span>
  {/if}
</div>

<div class="@container max-h-[500px] overflow-auto">
  <TeamEntryTable {pageData} {team} />
</div>
