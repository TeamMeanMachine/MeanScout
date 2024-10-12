<script lang="ts">
  import type { TeamInfo } from "$lib";
  import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
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

  const teamsFromMatches = getTeamsFromMatches();
  const matchCountPerTeam = getMatchCountPerTeam(teamsFromMatches);
  const entriesByTeam = getEntriesByTeam();
  const ranksPerPickList = surveyRecord.pickLists.map(createTeamRanking);

  let sortBy = $state<"team" | number | "done">("team");

  let teamInfos = $derived.by(() => {
    sortBy;
    const uniqueTeams = [...new Set([...surveyRecord.teams, ...teamsFromMatches])];
    return uniqueTeams.map(createTeamInfo).toSorted(sortTeamInfo);
  });

  let conflictingTeams = $derived([...new Set(surveyRecord.teams).intersection(new Set(teamsFromMatches))]);

  function getTeamsFromMatches() {
    if (surveyRecord.type != "match" || !surveyRecord.matches.length) {
      return [];
    }

    const teamsFromMatches: string[] = [];
    for (const match of surveyRecord.matches) {
      teamsFromMatches.push(match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3);
    }
    return teamsFromMatches;
  }

  function getMatchCountPerTeam(teamsFromMatches: string[]) {
    const matchCountPerTeam: Record<string, number> = {};
    for (const team of teamsFromMatches) {
      if (team in matchCountPerTeam) {
        matchCountPerTeam[team] += 1;
      } else {
        matchCountPerTeam[team] = 1;
      }
    }
    return matchCountPerTeam;
  }

  function getEntriesByTeam() {
    const entriesByTeam: Record<string, IDBRecord<Entry>[]> = {};
    for (const entry of entryRecords) {
      if (entry.team in entriesByTeam) {
        entriesByTeam[entry.team].push(entry);
      } else {
        entriesByTeam[entry.team] = [entry];
      }
    }
    return entriesByTeam;
  }

  function createTeamRanking(pickList: PickList) {
    const pickListData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, surveyRecord.expressions, entriesByTeam);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team] += normalizedTeamData[team];
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);

    const sortedTeamRankings = Object.keys(pickListData)
      .map((team) => ({ team, percentage: normalizedPickListData[team] }))
      .toSorted((a, b) => b.percentage - a.percentage)
      .map((data, index) => ({ team: data.team, rank: index + 1 }));

    const rankPerTeam: Record<string, number> = {};
    for (const ranking of sortedTeamRankings) {
      rankPerTeam[ranking.team] = ranking.rank;
    }
    return rankPerTeam;
  }

  function createTeamInfo(team: string): TeamInfo {
    const matchingEntries = entryRecords.filter((entry) => entry.status != "draft" && entry.team == team);

    let pickListRanks: number[] | undefined = undefined;
    if (ranksPerPickList.length) {
      pickListRanks = ranksPerPickList.map((pickList) => pickList[team]);
    }

    return {
      team,
      entryCount: matchingEntries.length,
      matchCount: matchCountPerTeam[team] ?? 0,
      isCustom: surveyRecord.teams.includes(team),
      pickListRanks,
    };
  }

  function sortTeamInfo(a: TeamInfo, b: TeamInfo) {
    const teamNumberCompare = a.team.localeCompare(b.team, "en", { numeric: true });

    if (typeof sortBy == "number" && a.pickListRanks?.length && b.pickListRanks?.length) {
      return a.pickListRanks[sortBy] - b.pickListRanks[sortBy];
    }

    if (sortBy == "done") {
      return a.entryCount / a.matchCount - b.entryCount / b.matchCount || teamNumberCompare;
    }

    return teamNumberCompare;
  }

  function fixTeams() {
    surveyRecord.teams = surveyRecord.teams.filter((team) => !conflictingTeams.includes(team));
  }

  function getOrdinal(n: number) {
    if (n % 10 == 1 && n % 100 != 11) {
      return "st";
    }

    if (n % 10 == 2 && n % 100 != 12) {
      return "nd";
    }

    if (n % 10 == 3 && n % 100 != 13) {
      return "rd";
    }

    return "th";
  }
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Teams</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  {#if $modeStore == "admin"}
    <AddTeamsDialog bind:surveyRecord allTeams={teamInfos} />
    {#if conflictingTeams.length}
      <Button onclick={fixTeams}>
        <Icon name="wrench" />
        <div class="flex flex-col">
          Fix teams
          <small>{conflictingTeams.length} custom teams were found in matches</small>
        </div>
      </Button>
    {/if}
  {/if}

  {#if teamInfos.length}
    <ViewTeamDialog bind:this={viewTeamDialog} bind:surveyRecord {entryRecords} />
    <div class="flex flex-col">
      <span class="mt-2">
        Sorting by
        {#if typeof sortBy == "number"}
          {surveyRecord.pickLists[sortBy].name}
        {:else}
          {sortBy}
        {/if}
      </span>
      <table class="w-full border-separate border-spacing-y-2">
        <thead class="sticky top-0 text-nowrap bg-neutral-900 align-bottom">
          <tr class="drop-shadow-2xl">
            <th class="w-0 p-2 pl-0 pr-1">
              <Button
                onclick={() => (sortBy = "team")}
                classes="w-full {sortBy == 'team' ? 'font-bold' : 'font-light'}"
              >
                Team
              </Button>
            </th>
            {#if ranksPerPickList.length}
              {#each surveyRecord.pickLists as pickList, i}
                {@const font = sortBy == i ? "font-bold" : "font-light"}
                <th class="w-0 p-2 px-1">
                  <Button onclick={() => (sortBy = i)} classes="w-full justify-center {font}">
                    {pickList.name}
                  </Button>
                </th>
              {/each}
            {/if}
            <th class="w-0 p-2 pl-1 pr-0">
              <Button
                onclick={() => (sortBy = "done")}
                classes="w-full justify-end {sortBy == 'done' ? 'font-bold' : 'font-light'}"
              >
                Done
              </Button>
            </th>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {#each teamInfos as teamInfo (teamInfo.team)}
            <tr
              tabindex="0"
              role="button"
              onclick={() => viewTeamDialog?.open(teamInfo)}
              onkeydown={(e) => {
                if (e.key == " " || e.key == "Enter") {
                  e.preventDefault();
                  viewTeamDialog?.open(teamInfo);
                }
              }}
              class="button cursor-pointer bg-neutral-800"
            >
              <td class="p-2">{teamInfo.team}</td>
              {#if teamInfo.pickListRanks?.length}
                {#each teamInfo.pickListRanks as pickListRank}
                  <td class="p-2 text-center">
                    {#if pickListRank > 0}
                      {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
                    {/if}
                  </td>
                {/each}
              {/if}
              <td class="p-2 text-right">
                {teamInfo.entryCount}{#if surveyRecord.type == "match" && surveyRecord.matches.length && teamInfo.matchCount}
                  <small class="font-light">/{teamInfo.matchCount}</small>
                {/if}
              </td>
              <td></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
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
