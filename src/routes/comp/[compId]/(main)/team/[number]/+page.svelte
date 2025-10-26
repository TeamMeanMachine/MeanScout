<script lang="ts">
  import type { PageProps } from "./$types";
  import Button from "$lib/components/Button.svelte";
  import { SquareArrowOutUpRightIcon, UserPenIcon, UserPlusIcon } from "@lucide/svelte";
  import { allianceTeamLabels, sessionStorageStore } from "$lib";
  import TeamMatchDataTable from "$lib/components/TeamMatchDataTable.svelte";
  import TeamPitDataTable from "$lib/components/TeamPitDataTable.svelte";
  import TimeChart from "$lib/components/TimeChart.svelte";
  import { openDialog } from "$lib/dialog";
  import AddTeamToAllianceDialog from "$lib/dialogs/AddTeamToAllianceDialog.svelte";
  import { idb } from "$lib/idb";
  import { invalidateAll } from "$app/navigation";

  let { data }: PageProps = $props();

  const allianceWithIndex = $derived(
    data.compRecord.alliances?.map((a, i) => ({ ...a, i })).find((a) => a.teams.includes(data.team.number)),
  );

  const showData = sessionStorageStore<"expressions" | "raw">("entry-view-show-data", "expressions");
</script>

<div class="flex flex-col gap-6">
  <div class="flex items-start justify-between gap-3">
    <div class="flex flex-col">
      <h2 class="font-bold">Team {data.team.number}</h2>
      {#if data.team.name}
        <span class="text-xs font-light text-balance">{data.team.name}</span>
      {/if}
    </div>

    <div class="flex items-center gap-2 text-end text-xs tracking-tighter text-nowrap">
      {#if allianceWithIndex}
        Alliance {allianceWithIndex.i + 1}<br />
        {allianceTeamLabels[allianceWithIndex.teams.indexOf(data.team.number)] || "Backup"}
      {/if}

      <Button
        onclick={() => {
          openDialog(AddTeamToAllianceDialog, {
            team: data.team,
            compAlliances: data.compRecord.alliances || [],
            onadd(newAlliances) {
              data = {
                ...data,
                compRecord: { ...data.compRecord, alliances: newAlliances, modified: new Date() },
              };
              idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
            },
          });
        }}
        class="text-sm"
      >
        {#if allianceWithIndex}
          <UserPenIcon class="text-theme size-5" />
        {:else}
          <UserPlusIcon class="text-theme size-5" />
        {/if}
      </Button>
    </div>
  </div>

  <TimeChart pageData={data} team={data.team} />

  {#each data.surveyRecords
    .filter((survey) => survey.type == "match")
    .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <div class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center justify-between">
        <h2 class="text-sm">{surveyRecord.name}</h2>

        <div class="flex flex-wrap gap-2 text-sm">
          <Button
            onclick={() => {
              $showData = "expressions";
            }}
            class={$showData == "expressions" ? "font-bold" : "font-light"}
          >
            Derived
          </Button>
          <Button
            onclick={() => {
              $showData = "raw";
            }}
            class={$showData == "raw" ? "font-bold" : "font-light"}
          >
            Raw
          </Button>
        </div>
      </div>

      <div class="w-full overflow-x-auto">
        {#key data.team}
          <TeamMatchDataTable pageData={data} {surveyRecord} team={data.team} show={$showData} />
        {/key}
      </div>
    </div>
  {/each}

  {#each data.surveyRecords
    .filter((s) => s.type == "pit")
    .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <div class="flex flex-col items-start gap-1 overflow-x-auto">
      <h2 class="sticky left-0 text-sm">{surveyRecord.name}</h2>

      {#key data.team}
        <TeamPitDataTable pageData={data} {surveyRecord} team={data.team} />
      {/key}
    </div>
  {/each}

  <div class="flex flex-wrap gap-x-4">
    {#if data.compRecord.tbaEventKey}
      <a
        href="https://www.thebluealliance.com/team/{parseInt(data.team.number)}/{parseInt(
          data.compRecord.tbaEventKey,
        )}#{data.compRecord.tbaEventKey}"
        target="_blank"
      >
        <span class="underline">TBA</span>
        <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
      </a>
    {:else}
      <a href="https://www.thebluealliance.com/team/{parseInt(data.team.number)}" target="_blank">
        <span class="underline">TBA</span>
        <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
      </a>
    {/if}

    <a href="https://www.statbotics.io/team/{parseInt(data.team.number)}" target="_blank">
      <span class="underline">Statbotics</span>
      <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
    </a>
  </div>
</div>
