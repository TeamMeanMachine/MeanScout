<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import EditTeamDialog from "$lib/dialogs/EditTeamDialog.svelte";
  import NewTeamsDialog from "$lib/dialogs/NewTeamsDialog.svelte";
  import type { PageData } from "./$types";
  import { objectStore } from "$lib/idb";
  import AdminHeader from "../AdminHeader.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="teams" />

  <div class="flex flex-wrap gap-3">
    <div class="flex grow basis-0 flex-col gap-2">
      <Button
        onclick={() =>
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
          })}
        class="flex-nowrap text-nowrap"
      >
        <Icon name="plus" />
        New team(s)
      </Button>

      {#if data.surveyRecord.teams.length}
        <div class="grid gap-2 pt-1" style="grid-template-columns: min-content auto">
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
        <small>No custom teams.</small>
        <small>
          {#if data.surveyType == "match" && data.surveyRecord.matches.length}
            Match teams are used depending on the selected target.
          {:else}
            Any team value is allowed.
          {/if}
        </small>
      {/if}
    </div>
  </div>
</div>
