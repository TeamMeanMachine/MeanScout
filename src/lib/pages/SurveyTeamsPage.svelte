<script lang="ts">
  import type { TeamInfo } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import AddTeamsDialog from "$lib/dialogs/AddTeamsDialog.svelte";
  import ViewTeamDialog from "$lib/dialogs/ViewTeamDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecords,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  let viewTeamDialog = $state<ViewTeamDialog | undefined>();

  const matchTeams: string[] = [];
  if (surveyRecord.type == "match" && surveyRecord.matches.length) {
    for (const match of surveyRecord.matches) {
      matchTeams.push(match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3);
    }
  }

  const matchesPerTeam: Record<string, number> = {};
  for (const team of matchTeams) {
    if (team in matchesPerTeam) {
      matchesPerTeam[team] += 1;
    } else {
      matchesPerTeam[team] = 1;
    }
  }

  let allTeams = $derived([...new Set([...surveyRecord.teams, ...matchTeams])].toSorted(sortTeams).map(createTeamData));

  let conflictedTeams = $derived([...new Set(surveyRecord.teams).intersection(new Set(matchTeams))]);

  function sortTeams(a: string, b: string) {
    return a.localeCompare(b, "en", { numeric: true });
  }

  function createTeamData(team: string): TeamInfo {
    const matchingEntries = entryRecords.filter((entry) => entry.status != "draft" && entry.team == team);
    return {
      team,
      entryCount: matchingEntries.length,
      matchCount: matchesPerTeam[team] ?? 0,
      isCustom: surveyRecord.teams.includes(team),
    };
  }

  function fixTeams() {
    surveyRecord.teams = surveyRecord.teams.filter((team) => !conflictedTeams.includes(team));
  }
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Teams</h1>
</Header>

{#snippet teamRow(teamData: any)}
  <td class="p-2">{teamData.team}</td>
  <td class="p-2">{teamData.entryCount}</td>
  {#if surveyRecord.type == "match" && surveyRecord.matches.length}
    <td class="p-2">
      {#if teamData.matchCount}
        {teamData.matchCount}
      {/if}
    </td>
  {/if}
  {#if surveyRecord.teams.length}
    <td class="p-2 text-center">
      {#if teamData.isCustom}
        <Icon name="check" />
      {/if}
    </td>
  {/if}
  <td></td>
{/snippet}

<div class="flex flex-col gap-2 p-3">
  {#if $modeStore == "admin"}
    <AddTeamsDialog bind:surveyRecord {allTeams} />
    {#if conflictedTeams.length}
      <Button onclick={fixTeams}>
        <Icon name="wrench" />
        <div class="flex flex-col">
          Fix teams
          <small>{conflictedTeams.length} custom teams were found in matches</small>
        </div>
      </Button>
    {/if}
  {/if}

  {#if allTeams.length}
    <ViewTeamDialog bind:this={viewTeamDialog} bind:surveyRecord />
    <table class="w-full border-separate border-spacing-y-2 text-right">
      <thead class="sticky top-0 text-nowrap bg-neutral-900 align-bottom">
        <tr>
          <th class="w-0 p-2">Team</th>
          <th class="w-0 p-2">Entries</th>
          {#if surveyRecord.type == "match" && surveyRecord.matches.length}
            <th class="w-0 p-2">Matches</th>
          {/if}
          {#if surveyRecord.teams.length}
            <th class="w-0 p-2">Custom</th>
          {/if}
          <td></td>
        </tr>
      </thead>
      <tbody>
        {#each allTeams as teamData (teamData.team)}
          {#if $modeStore == "admin"}
            <tr
              tabindex="0"
              role="button"
              onclick={() => viewTeamDialog?.open(teamData)}
              onkeydown={(e) => {
                if (e.key == " " || e.key == "Enter") {
                  e.preventDefault();
                  viewTeamDialog?.open(teamData);
                }
              }}
              class="button cursor-pointer bg-neutral-800"
            >
              {@render teamRow(teamData)}
            </tr>
          {:else}
            <tr>
              {@render teamRow(teamData)}
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {:else}
    <span>
      No teams.
      {#if surveyRecord.type == "match" && surveyRecord.matches.length}
        Note that teams from matches are used depending on the selected target.
      {:else}
        Any team value is allowed.
      {/if}
    </span>
  {/if}
</div>
