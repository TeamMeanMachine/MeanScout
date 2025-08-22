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

<CompPageHeader pageData={data} page="teams" pageTitle="Teams" />

<div class="flex flex-col gap-3 max-md:mt-9 max-md:mb-20" style="view-transition-name:teams">
  <h2 class="font-bold md:hidden">Teams</h2>

  {#if data.teams.length}
    <div class="flex flex-wrap gap-4">
      <select bind:value={selectedString} class="text-theme min-w-0 grow bg-neutral-800 p-2">
        {#each data.teams as team}
          <option value={team.number}>{team.number} {team.name}</option>
        {/each}
      </select>
    </div>

    {#each data.surveyRecords.toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord (surveyRecord.id)}
      <div class="flex flex-col gap-1">
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
