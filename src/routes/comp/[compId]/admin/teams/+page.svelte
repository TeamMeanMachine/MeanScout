<script lang="ts">
  import { PlusIcon } from "@lucide/svelte";
  import { rerunAllContextLoads } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditTeamDialog from "$lib/dialogs/EditTeamDialog.svelte";
  import NewTeamsDialog from "$lib/dialogs/NewTeamsDialog.svelte";
  import { idb } from "$lib/idb";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-3">
    {#if data.compRecord.teams.length}
      <div class="grid gap-2" style="grid-template-columns: min-content auto">
        {#each data.compRecord.teams.toSorted( (a, b) => a.number.localeCompare( b.number, "en", { numeric: true }, ), ) as team (team.number)}
          <Button
            onclick={() => {
              openDialog(EditTeamDialog, {
                team,
                onedit(name) {
                  const teams = structuredClone($state.snapshot(data.compRecord.teams));
                  const teamToEdit = teams.find((t) => t.number == team.number);
                  if (teamToEdit) teamToEdit.name = name;
                  data = {
                    ...data,
                    compRecord: { ...data.compRecord, teams, modified: new Date() },
                  };
                  idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
                },
                ondelete() {
                  data = {
                    ...data,
                    compRecord: {
                      ...data.compRecord,
                      teams: data.compRecord.teams.filter((t) => t.number != team.number),
                      modified: new Date(),
                    },
                  };
                  idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
                },
              });
            }}
            class="col-span-full grid grid-cols-subgrid"
          >
            <div class="font-bold">{team.number}</div>
            {#if team.name}
              <div class="text-sm font-light">{team.name}</div>
            {/if}
          </Button>
        {/each}
      </div>
    {:else}
      <span class="text-sm">
        No custom teams.
        {#if data.compRecord.matches.length}
          Teams from matches are allowed depending on the selected target.
        {:else}
          Any team value is allowed.
        {/if}
      </span>
    {/if}

    <div
      class="sticky bottom-3 z-20 ml-2 flex flex-col self-start border border-neutral-500 bg-neutral-900 p-2 shadow-2xl"
    >
      <Button
        onclick={() => {
          openDialog(NewTeamsDialog, {
            teams: data.compRecord.teams,
            onadd(teams) {
              data = {
                ...data,
                compRecord: {
                  ...data.compRecord,
                  teams: [...data.compRecord.teams, ...teams.map((team) => ({ number: team, name: "" }))],
                  modified: new Date(),
                },
              };
              idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
            },
          });
        }}
        class="text-sm"
      >
        <PlusIcon class="size-5 text-theme" />
        New team(s)
      </Button>
    </div>
  </div>
</div>
