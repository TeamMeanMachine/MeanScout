<script lang="ts">
  import type { PageProps } from "./$types";
  import TeamEntryTable from "$lib/components/TeamEntryTable.svelte";
  import CompPageHeader from "../CompPageHeader.svelte";

  let { data }: PageProps = $props();

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

<CompPageHeader compRecord={data.compRecord} surveyRecords={data.surveyRecords} page="teams" pageTitle="Teams" />

<div class="flex flex-col gap-4" style="view-transition-name:teams">
  {#if data.teams.length}
    <div class="flex flex-wrap gap-4">
      <select bind:value={selectedString} class="text-theme min-w-0 grow bg-neutral-800 p-2">
        {#each data.teams as team}
          <option value={team.number}>{team.number} {team.name}</option>
        {/each}
      </select>
    </div>

    {#each data.surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as surveyRecord (surveyRecord.id)}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">{surveyRecord.name}</h2>

        {#if selected}
          <div class="@container overflow-x-auto">
            <TeamEntryTable pageData={data} {surveyRecord} team={selected} />
          </div>
        {/if}
      </div>
    {/each}
  {:else}
    <span class="text-sm">No data on any teams.</span>
  {/if}
</div>
