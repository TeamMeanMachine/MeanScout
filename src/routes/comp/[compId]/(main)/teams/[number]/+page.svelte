<script lang="ts">
  import { SquareArrowOutUpRightIcon, SquarePenIcon, UserPenIcon, UserPlusIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { allianceTeamLabels, rerunAllContextLoads, rerunOtherContextLoads } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import TeamMatchDataTable from "$lib/components/TeamMatchDataTable.svelte";
  import TeamPitDataTable from "$lib/components/TeamPitDataTable.svelte";
  import TimeChart from "$lib/components/TimeChart.svelte";
  import { openDialog } from "$lib/dialog";
  import AddTeamToAllianceDialog from "$lib/dialogs/AddTeamToAllianceDialog.svelte";
  import EditTeamDialog from "$lib/dialogs/EditTeamDialog.svelte";
  import { idb } from "$lib/idb";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const allianceWithIndex = $derived(
    data.compRecord.alliances?.map((a, i) => ({ ...a, i })).find((a) => a.teams.includes(data.team.number)),
  );
</script>

<div class="mt-[57px] flex grow flex-col gap-6 overflow-x-hidden px-3 py-6 max-lg:mb-[65px] lg:ml-80">
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
              idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
            },
          });
        }}
        class="text-sm"
      >
        {#if allianceWithIndex}
          <UserPenIcon class="size-5 text-theme" />
        {:else}
          <UserPlusIcon class="size-5 text-theme" />
        {/if}
      </Button>

      <Button
        onclick={() => {
          openDialog(EditTeamDialog, {
            team: data.team,
            onedit(name) {
              const teams = $state.snapshot(data.compRecord.teams);
              let teamToEdit = teams.find((t) => t.number == data.team.number);
              if (teamToEdit) {
                teamToEdit.name = name;
              } else {
                teamToEdit = { number: data.team.number, name };
                teams.push(teamToEdit);
                teams.sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
              }
              data = {
                ...data,
                compRecord: { ...data.compRecord, teams, modified: new Date() },
              };
              idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
            },
            ondelete() {
              idb.put(
                "comps",
                $state.snapshot({
                  ...data.compRecord,
                  teams: data.compRecord.teams.filter((t) => t.number != data.team.number),
                  modified: new Date(),
                }),
              ).onsuccess = () => {
                rerunOtherContextLoads();
                goto(`#/comp/${data.compRecord.id}/teams`, { replaceState: true, invalidateAll: true });
              };
            },
          });
        }}
      >
        <SquarePenIcon class="size-5 text-theme" />
      </Button>
    </div>
  </div>

  {#if !data.anyData}
    <span class="text-sm">No data available.</span>
  {:else}
    {#key data.team.number}
      <TimeChart pageData={data} team={data.team} />
    {/key}

    {#each data.surveyRecords
      .filter((survey) => survey.type == "match")
      .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
      <div class="-mr-3 flex flex-col items-start gap-1 overflow-x-auto pr-3">
        <h2 class="sticky left-0 text-sm">{surveyRecord.name}</h2>

        {#key data.team}
          <TeamMatchDataTable pageData={data} {surveyRecord} team={data.team} />
        {/key}
      </div>
    {/each}

    {#each data.surveyRecords
      .filter((s) => s.type == "pit")
      .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
      <div class="-mr-3 flex flex-col items-start gap-1 overflow-x-auto pr-3">
        <h2 class="sticky left-0 text-sm">{surveyRecord.name}</h2>

        {#key data.team}
          <TeamPitDataTable pageData={data} {surveyRecord} team={data.team} />
        {/key}
      </div>
    {/each}
  {/if}

  <div class="flex flex-wrap gap-x-4">
    {#if data.compRecord.tbaEventKey}
      <a
        href="https://www.thebluealliance.com/team/{parseInt(data.team.number)}/{parseInt(
          data.compRecord.tbaEventKey,
        )}#{data.compRecord.tbaEventKey}"
        target="_blank"
      >
        <span class="underline">TBA</span>
        <SquareArrowOutUpRightIcon class="inline size-4 text-theme" strokeWidth={3} />
      </a>
    {:else}
      <a href="https://www.thebluealliance.com/team/{parseInt(data.team.number)}" target="_blank">
        <span class="underline">TBA</span>
        <SquareArrowOutUpRightIcon class="inline size-4 text-theme" strokeWidth={3} />
      </a>
    {/if}

    <a href="https://www.statbotics.io/team/{parseInt(data.team.number)}" target="_blank">
      <span class="underline">Statbotics</span>
      <SquareArrowOutUpRightIcon class="inline size-4 text-theme" strokeWidth={3} />
    </a>
  </div>
</div>
