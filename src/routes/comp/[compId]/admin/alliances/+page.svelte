<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import type { PageProps } from "./$types";
  import { idb } from "$lib/idb";
  import { PlusIcon } from "@lucide/svelte";
  import { invalidateAll } from "$app/navigation";
  import EditAllianceTeamDialog from "$lib/dialogs/EditAllianceTeamDialog.svelte";
  import NewAllianceTeamDialog from "$lib/dialogs/NewAllianceTeamDialog.svelte";

  let { data }: PageProps = $props();

  const standardCols = 5;

  const mostBackups = $derived(
    (data.compRecord.alliances || []).map((a) => a.teams.length).reduce((prev, curr) => Math.max(prev, curr - 3), 0) ||
      0,
  );

  const teamLabels = ["Captain", "1st Pick", "2nd Pick"];
</script>

<div class="flex flex-col gap-3">
  <div
    class="-mx-3 -my-1 grid gap-3 overflow-x-auto px-3 py-1 text-center"
    style="grid-template-columns: repeat({mostBackups + standardCols}, min-content);"
  >
    <div class="col-span-full grid grid-cols-subgrid text-xs font-light text-nowrap">
      <div>Alliance</div>
      {#each teamLabels as label}
        <div>{label}</div>
      {/each}
      {#if mostBackups}
        <div>Backup</div>
      {/if}
    </div>
    {#each data.compRecord.alliances || [] as alliance, allianceIndex}
      <div class="col-span-full grid grid-cols-subgrid items-center">
        <div>{allianceIndex + 1}</div>
        {#each alliance.teams as team, teamIndex}
          <Button
            onclick={() => {
              openDialog(EditAllianceTeamDialog, {
                teams: data.compRecord.teams,
                allianceIndex,
                team,
                teamLabel: teamLabels[teamIndex] || "Backup",
                onedit(newTeam) {
                  if (data.compRecord.alliances == undefined) return;
                  data.compRecord.alliances[allianceIndex].teams[teamIndex] = newTeam;
                  data.compRecord.modified = new Date();
                  idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
                },
                ondelete() {
                  if (data.compRecord.alliances == undefined) return;
                  data.compRecord.modified = new Date();

                  if (alliance.teams.length <= 1) {
                    data.compRecord.alliances = data.compRecord.alliances.filter((_, i) => i != allianceIndex);
                  } else {
                    data.compRecord.alliances[allianceIndex].teams = data.compRecord.alliances[
                      allianceIndex
                    ].teams.filter((t) => t != team);
                  }

                  idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
                },
              });
            }}
            class="justify-center"
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
              teams: data.compRecord.teams,
              allianceIndex,
              teamLabel: teamLabels[alliance.teams.length] || "Backup",
              onadd(newTeam) {
                data.compRecord.alliances = [...(data.compRecord.alliances || []), { teams: [newTeam] }];
                data.compRecord.modified = new Date();
                idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
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
          teams: data.compRecord.teams,
          allianceIndex: (data.compRecord.alliances || []).length,
          teamLabel: teamLabels[0],
          onadd(newTeam) {
            data.compRecord.alliances = [...(data.compRecord.alliances || []), { teams: [newTeam] }];
            data.compRecord.modified = new Date();
            idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = invalidateAll;
          },
        });
      }}
      class="col-span-1 justify-self-center"
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
