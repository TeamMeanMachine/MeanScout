<script lang="ts">
  import type { PageProps } from "./$types";
  import TeamDerivedDataTable from "$lib/components/TeamDerivedDataTable.svelte";
  import TeamRawDataTable from "$lib/components/TeamRawDataTable.svelte";
  import CompPageHeader from "../CompPageHeader.svelte";
  import Button from "$lib/components/Button.svelte";
  import { ChevronDownIcon, ChevronUpIcon, UsersIcon } from "@lucide/svelte";
  import { sessionStorageStore } from "$lib";

  let { data }: PageProps = $props();

  const showData = sessionStorageStore<"expressions" | "raw">("entry-view-show-data", "expressions");

  const debounceTimeMillis = 500;

  let debounceTimer: number | undefined = undefined;

  let selecting = $state(false);
  let selectedTeam = $state(initialTeam());
  let filteredTeams = $state(data.teams);

  function initialTeam() {
    const teamNumber = sessionStorage.getItem("team-view");
    if (!teamNumber) return;
    return data.teams.find((team) => team.number == teamNumber);
  }

  function onsearchinput(value: string) {
    window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      const search = value.trim().toLowerCase().replaceAll(" ", "");

      if (!search) {
        filteredTeams = data.teams;
      } else {
        filteredTeams = data.teams.filter((team) => {
          return (
            team.number.includes(parseInt(search).toString()) ||
            team.name.toLowerCase().replaceAll(" ", "").includes(search)
          );
        });
      }
    }, debounceTimeMillis);
  }
</script>

<CompPageHeader pageData={data} page="teams" pageTitle="Teams" />

<div class="flex flex-col gap-6 max-md:mt-9 max-md:mb-20" style="view-transition-name:teams">
  {#if !data.teams.length}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold md:hidden">Teams</h2>
      <span class="text-sm">No data on any teams.</span>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold md:hidden">Teams</h2>

      <div class="flex flex-col gap-4">
        <Button onclick={() => (selecting = !selecting)} class="flex-nowrap!">
          <UsersIcon class="text-theme shrink-0" />

          {#if selectedTeam}
            <div class="flex grow flex-col">
              <span class="font-bold">{selectedTeam.number}</span>
              {#if selectedTeam.name}
                <span class="text-xs font-light">{selectedTeam.name}</span>
              {/if}
            </div>
          {:else}
            <span class="grow">Select</span>
          {/if}

          {#if !selecting && selectedTeam}
            <ChevronDownIcon class="text-theme shrink-0" />
          {:else}
            <ChevronUpIcon class="text-theme shrink-0" />
          {/if}
        </Button>

        {#if !selecting && selectedTeam && data.hasExpressions}
          <div class="flex gap-2 text-sm">
            <Button
              onclick={() => ($showData = "expressions")}
              class={$showData == "expressions" ? "font-bold" : "font-light"}
            >
              Derived
            </Button>
            <Button onclick={() => ($showData = "raw")} class={$showData == "raw" ? "font-bold" : "font-light"}>
              Raw
            </Button>
          </div>
        {/if}
      </div>
    </div>

    {#if !selecting && selectedTeam}
      {#each data.surveyRecords.toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
        <div class="flex flex-col gap-1 overflow-x-auto">
          <h2 class="sticky left-0 font-bold">{surveyRecord.name}</h2>

          {#if $showData == "expressions" && surveyRecord.type == "match"}
            <TeamDerivedDataTable pageData={data} {surveyRecord} team={selectedTeam} />
          {:else}
            <TeamRawDataTable pageData={data} {surveyRecord} team={selectedTeam} />
          {/if}
        </div>
      {/each}
    {:else}
      <label class="flex flex-col text-sm">
        Search
        <input oninput={(e) => onsearchinput(e.currentTarget.value)} class="text-theme bg-neutral-800 p-2" />
      </label>

      <div class="flex flex-col gap-3">
        {#each filteredTeams as team}
          <Button
            onclick={() => {
              selecting = false;
              scrollTo(0, 0);
              selectedTeam = team;
              filteredTeams = data.teams;
              sessionStorage.setItem("team-view", team.number);
            }}
            class="flex-nowrap!"
          >
            <div class="flex flex-col">
              <span class="font-bold">{team.number}</span>
              {#if team.name}
                <span class="text-xs font-light">{team.name}</span>
              {/if}
            </div>
          </Button>
        {/each}
      </div>
    {/if}
  {/if}
</div>
