<script lang="ts">
  import type { PageData } from "./$types";
  import Header from "$lib/components/Header.svelte";
  import TeamEntryTable from "$lib/components/TeamEntryTable.svelte";

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

<Header
  title="Teams - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Teams" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-4" style="view-transition-name:teams">
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
</div>
