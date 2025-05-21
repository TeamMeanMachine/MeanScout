<script lang="ts">
  import { type Team } from "$lib";
  import TeamEntryTable from "$lib/components/TeamEntryTable.svelte";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";

  let {
    pageData,
    team,
  }: {
    pageData: PageData;
    team: Team;
  } = $props();
</script>

<div class="flex flex-col">
  <strong>Team {team.number}</strong>
  {#if team.name}
    <small class="font-light">{team.name}</small>
  {/if}
</div>

<div class="@container max-h-[500px] overflow-auto">
  <TeamEntryTable {pageData} {team} />
</div>
