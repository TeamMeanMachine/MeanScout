<script lang="ts">
  import type { PageData } from "./$types";
  import TeamEntryTable from "$lib/components/TeamEntryTable.svelte";
  import SurveyPageHeader from "../SurveyPageHeader.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let selectedString = $state(defaultSelectionString());

  let selected = $derived.by(() => {
    if (!selectedString) return defaultSelection();
    return data.teams.find((info) => info.number == selectedString);
  });

  $effect(() => {
    if (!selectedString) return;
    sessionStorage.setItem("team-view", selectedString);
  });

  function defaultSelectionString() {
    const value = sessionStorage.getItem("team-view");

    if (value && data.teams.some((info) => info.number == value)) {
      return value;
    }

    return defaultSelection()?.number || undefined;
  }

  function defaultSelection() {
    return data.teams.at(0);
  }
</script>

<SurveyPageHeader surveyRecord={data.surveyRecord} page="teams" pageTitle="Teams" />

<div class="flex flex-col gap-4" style="view-transition-name:teams">
  {#if data.teams.length}
    <div class="flex flex-wrap gap-4">
      <select bind:value={selectedString} class="text-theme min-w-0 grow bg-neutral-800 p-2">
        {#each data.teams as team}
          <option value={team.number}>{team.number} {team.name}</option>
        {/each}
      </select>
    </div>

    <div class="@container overflow-x-auto">
      {#if selected}
        <TeamEntryTable pageData={data} team={selected} />
      {:else}
        <span class="text-sm">No team found.</span>
      {/if}
    </div>
  {:else}
    <span class="text-sm">No data on any teams.</span>
  {/if}
</div>
