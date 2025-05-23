<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditTeamDialog from "$lib/dialogs/EditTeamDialog.svelte";
  import NewTeamsDialog from "$lib/dialogs/NewTeamsDialog.svelte";
  import type { PageData } from "./$types";
  import { objectStore } from "$lib/idb";
  import AdminHeader from "../AdminHeader.svelte";
  import { PlusIcon } from "@lucide/svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="teams" />

  <div class="flex flex-col gap-3">
    {#if data.surveyRecord.teams.length}
      <div class="grid gap-2" style="grid-template-columns: min-content auto">
        {#each data.surveyRecord.teams.toSorted( (a, b) => a.number.localeCompare( b.number, "en", { numeric: true }, ), ) as team (team.number)}
          <Button
            onclick={() => {
              openDialog(EditTeamDialog, {
                team,
                onedit(name) {
                  const teams = structuredClone($state.snapshot(data.surveyRecord.teams));
                  const teamToEdit = teams.find((t) => t.number == team.number);
                  if (teamToEdit) teamToEdit.name = name;
                  data = {
                    ...data,
                    surveyRecord: { ...data.surveyRecord, teams: teams, modified: new Date() },
                  } as PageData;
                  objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                },
                ondelete() {
                  data = {
                    ...data,
                    surveyRecord: {
                      ...data.surveyRecord,
                      teams: data.surveyRecord.teams.filter((team) => team.number != team.number),
                      modified: new Date(),
                    },
                  } as PageData;
                  objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
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
        {#if data.surveyType == "match" && data.surveyRecord.matches.length}
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
            teams: data.surveyRecord.teams,
            onadd(teams) {
              data = {
                ...data,
                surveyRecord: {
                  ...data.surveyRecord,
                  teams: [...data.surveyRecord.teams, ...teams.map((team) => ({ number: team, name: "" }))],
                  modified: new Date(),
                },
              } as PageData;
              objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
            },
          });
        }}
        class="text-sm"
      >
        <PlusIcon class="text-theme size-5" />
        New team(s)
      </Button>
    </div>
  </div>
</div>
