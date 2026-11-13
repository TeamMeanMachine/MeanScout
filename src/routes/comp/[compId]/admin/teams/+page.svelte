<script lang="ts">
  import { PlusIcon } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import { rerunAllContextLoads } from "#lib";
  import Button from "#lib/components/Button.svelte";
  import { openDialog } from "#lib/dialog.ts";
  import EditTeamDialog from "#lib/dialogs/EditTeamDialog.svelte";
  import NewTeamsDialog from "#lib/dialogs/NewTeamsDialog.svelte";
  import { idb } from "#lib/idb.ts";

  let { data }: PageProps = $props();

  const sortedTeams = $derived(
    data.compRecord.teams.toSorted((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
  );
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-3">
    {#if data.compRecord.teams.length}
      <div class="grid gap-2" style="grid-template-columns: min-content auto">
        {#each sortedTeams as team (team.number)}
          <Button
            onclick={() => {
              openDialog(EditTeamDialog, {
                team,
                onedit(name) {
                  team.name = name;
                  data = {
                    ...data,
                    compRecord: { ...data.compRecord, modified: Date.now() },
                  };
                  idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
                },
                ondelete() {
                  data = {
                    ...data,
                    compRecord: {
                      ...data.compRecord,
                      teams: data.compRecord.teams.filter((t) => t.number != team.number),
                      modified: Date.now(),
                    },
                  };
                  idb.put("comps", $state.snapshot(data.compRecord)).onsuccess = rerunAllContextLoads;
                },
              });
            }}
            class="col-span-full grid grid-cols-subgrid gap-4"
          >
            <div class="font-bold">{team.number}</div>
            {#if team.name}
              <div class="text-sm">{team.name}</div>
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
                  modified: Date.now(),
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
