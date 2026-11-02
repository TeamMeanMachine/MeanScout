<script lang="ts">
  import { PlusIcon } from "@lucide/svelte";
  import { rerunAllContextLoads } from "#lib";
  import Button from "#lib/components/Button.svelte";
  import { openDialog } from "#lib/dialog.ts";
  import EditTeamDialog from "#lib/dialogs/EditTeamDialog.svelte";
  import NewTeamsDialog from "#lib/dialogs/NewTeamsDialog.svelte";
  import { idb } from "#lib/idb.ts";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const sortedTeams = $derived(
    data.compRecord.teams.toSorted((a, b) =>
      (a.remap || a.number).localeCompare(b.remap || b.number, undefined, { numeric: true }),
    ),
  );

  const teamNames = $derived.by(() => {
    const teamNames = new Map<string, string>();
    for (const team of data.compRecord.teams) {
      if (team.name) teamNames.set(parseInt(team.number).toString(), team.name);
    }
    return teamNames;
  });
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
                onedit(name, remap) {
                  const teams = $state.snapshot(data.compRecord.teams);
                  const teamToEdit = teams.find((t) => t.number == team.number);
                  if (teamToEdit) {
                    teamToEdit.name = name;
                    if (!remap) {
                      delete teamToEdit.remap;
                    } else {
                      teamToEdit.remap = remap;
                    }
                  }
                  data = {
                    ...data,
                    compRecord: { ...data.compRecord, teams, modified: Date.now() },
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
            <div class="font-bold">
              {#if team.remap}
                {team.remap}
                <div class="text-xs font-light">({team.number})</div>
              {:else}
                {team.number}
              {/if}
            </div>

            {const remapName = $derived.by(() => {
              if (!team.remap) return;
              const newNumber = team.remap;
              const numberSuffix = newNumber.at(-1);
              const name = teamNames.get(parseInt(newNumber).toString());
              if (name) return `${name} ${numberSuffix}`;
            })}
            {#if remapName}
              <div class="text-sm">
                {remapName}
                {#if team.name}
                  <div class="mt-0.5 text-xs font-light">({team.name})</div>
                {/if}
              </div>
            {:else if team.name}
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
