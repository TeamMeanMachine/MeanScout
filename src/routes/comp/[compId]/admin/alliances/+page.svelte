<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import type { PageProps } from "./$types";
  import { idb } from "$lib/idb";
  import { PlusIcon } from "@lucide/svelte";
  import { invalidateAll } from "$app/navigation";
  import EditAllianceTeamDialog from "$lib/dialogs/EditAllianceTeamDialog.svelte";
  import NewAllianceTeamDialog from "$lib/dialogs/NewAllianceTeamDialog.svelte";
  import { allianceTeamLabels } from "$lib";

  let { data }: PageProps = $props();

  let compRecord = $state($state.snapshot(data.compRecord));

  const standardCols = 5;

  const mostBackups = $derived(
    (compRecord.alliances || []).map((a) => a.teams.length).reduce((prev, curr) => Math.max(prev, curr - 3), 0) || 0,
  );
</script>

<div class="flex flex-col gap-3">
  <div
    class="-mx-3 -my-1 grid gap-3 overflow-x-auto px-3 py-1 text-center"
    style="grid-template-columns: repeat({mostBackups + standardCols}, min-content);"
  >
    <div class="col-span-full grid grid-cols-subgrid text-xs font-light tracking-tighter text-nowrap">
      <div class="-mr-2">Alliance</div>
      {#each allianceTeamLabels as label}
        <div>{label}</div>
      {/each}
      {#if mostBackups}
        <div>Backup</div>
      {/if}
    </div>

    {#each compRecord.alliances || [] as alliance, allianceIndex}
      <div class="col-span-full grid grid-cols-subgrid items-center">
        <div class="-mr-2">{allianceIndex + 1}</div>

        {#each alliance.teams as team, teamIndex}
          <Button
            onclick={() => {
              openDialog(EditAllianceTeamDialog, {
                teams: compRecord.teams,
                allianceIndex,
                team,
                teamLabel: allianceTeamLabels[teamIndex] || "Backup",
                onedit(newTeam) {
                  if (compRecord.alliances == undefined) return;
                  compRecord.alliances[allianceIndex].teams[teamIndex] = newTeam;
                  compRecord.modified = new Date();
                  idb.put("comps", $state.snapshot(compRecord)).onsuccess = invalidateAll;
                },
                ondelete() {
                  if (compRecord.alliances == undefined) return;
                  if (alliance.teams.length <= 1) {
                    compRecord.alliances.splice(allianceIndex, 1);
                  } else {
                    compRecord.alliances[allianceIndex].teams.splice(teamIndex, 1);
                  }
                  compRecord.modified = new Date();
                  idb.put("comps", $state.snapshot(compRecord)).onsuccess = invalidateAll;
                },
              });
            }}
            class="min-w-15 justify-center self-stretch px-1"
          >
            {team}
          </Button>
        {/each}

        {#each { length: mostBackups - (alliance.teams.length - 3) }}
          <div></div>
        {/each}

        <Button
          onclick={() => {
            openDialog(NewAllianceTeamDialog, {
              teams: compRecord.teams,
              allianceIndex,
              teamLabel: allianceTeamLabels[alliance.teams.length] || "Backup",
              onadd(newTeam) {
                if (compRecord.alliances == undefined) return;
                compRecord.alliances[allianceIndex].teams.push(newTeam);
                compRecord.modified = new Date();
                idb.put("comps", $state.snapshot(compRecord)).onsuccess = invalidateAll;
              },
            });
          }}
          class="ml-1"
        >
          <PlusIcon class="text-theme" />
        </Button>
      </div>
    {/each}

    <Button
      onclick={() => {
        openDialog(NewAllianceTeamDialog, {
          teams: compRecord.teams,
          allianceIndex: (compRecord.alliances || []).length,
          teamLabel: allianceTeamLabels[0],
          onadd(newTeam) {
            if (compRecord.alliances == undefined) {
              compRecord.alliances = [{ teams: [newTeam] }];
            } else {
              compRecord.alliances.push({ teams: [newTeam] });
            }
            compRecord.modified = new Date();
            idb.put("comps", $state.snapshot(compRecord)).onsuccess = invalidateAll;
          },
        });
      }}
      class="col-span-1 -mr-2 justify-self-center"
    >
      <PlusIcon class="text-theme" />
    </Button>
  </div>
</div>

<div class="flex flex-col gap-2 text-sm font-light">
  <span>Once you add teams, click them to edit (or delete).</span>
  <span>If you delete the last team in an alliance, the whole alliance will be deleted.</span>
  <span>Deleting a team will shift over remaining teams in that alliance.</span>
  <span>Deleting alliances will also shift over remaining alliances.</span>
</div>
