<script lang="ts">
  import type { TeamInfo } from "$lib";
  import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import AddTeamsDialog from "$lib/dialogs/AddTeamsDialog.svelte";
  import ViewTeamDialog from "$lib/dialogs/ViewTeamDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecords,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  const teamsFromMatches = getTeamsFromMatches();
  const matchCountPerTeam = getMatchCountPerTeam(teamsFromMatches);
  const entriesByTeam = getEntriesByTeam();

  let ranksPerPickList = $derived.by(() => {
    if (surveyRecord.type != "match") return [];
    surveyRecord.skippedTeams;
    return surveyRecord.pickLists.map(createTeamRanking);
  });

  let sortBy = $state<"team" | number | "done">("team");

  let skippingTeams = $state(false);

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
    if (surveyRecord.type != "match") {
      return {};
    }

    const pickListData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      if (surveyRecord.skippedTeams?.includes(team)) {
        continue;
      }

      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, surveyRecord.expressions, entriesByTeam);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        if (surveyRecord.skippedTeams?.includes(team)) {
          continue;
        }

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

    let skipped = undefined;
    if (surveyRecord.type == "match" && surveyRecord.skippedTeams?.includes(team)) {
      skipped = true;
    }

    let pickListRanks = undefined;
    if (ranksPerPickList.length) {
      pickListRanks = ranksPerPickList.map((pickList) => (skipped ? 0 : pickList[team]));
    }

    return {
      team,
      entryCount: matchingEntries.length,
      matchCount: matchCountPerTeam[team] ?? 0,
      isCustom: surveyRecord.teams.includes(team),
      pickListRanks,
      skipped,
    };
  }

  function sortTeamInfo(a: TeamInfo, b: TeamInfo) {
    const teamNumberCompare = a.team.localeCompare(b.team, "en", { numeric: true });

    if (typeof sortBy == "number" && a.pickListRanks?.length && b.pickListRanks?.length) {
      const aRank = a.pickListRanks[sortBy];
      const bRank = b.pickListRanks[sortBy];

      if (aRank == 0 && bRank > 0) return 1;
      if (aRank > 0 && bRank == 0) return -1;
      return aRank - bRank;
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

  function unskipAllTeams() {
    if (surveyRecord.type != "match") return;
    surveyRecord.skippedTeams = undefined;
  }
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Teams</h1>
</Header>

{#if $modeStore == "admin"}
  <div class="flex flex-col gap-2 p-3">
    <Button onclick={() => openDialog(AddTeamsDialog, { surveyRecord, allTeams: teamInfos })}>
      <Icon name="plus" />
      Add custom team(s)
    </Button>
  </div>
{/if}

<div class="flex flex-col gap-2 p-3">
  {#if $modeStore == "admin"}
    {#if conflictingTeams.length}
      <Button onclick={fixTeams}>
        <Icon name="wrench" />
        <div class="flex flex-col">
          Fix teams
          <small>{conflictingTeams.length} custom teams were found in matches</small>
        </div>
      </Button>
    {/if}
    <div class="flex flex-wrap gap-2">
      <Button onclick={() => (skippingTeams = !skippingTeams)}>
        {#if skippingTeams}
          <Icon name="xmark" />
          Stop
        {:else}
          <Icon name="forward" />
          Skip teams
        {/if}
      </Button>
      {#if skippingTeams && surveyRecord.type == "match" && surveyRecord.skippedTeams?.length}
        <Button onclick={unskipAllTeams}>
          <Icon name="arrow-rotate-left" />
          Reset
        </Button>
      {/if}
    </div>
  {/if}
  {#if teamInfos.length}
    <div class="flex flex-col">
      <span>
        {#if skippingTeams && surveyRecord.type == "match"}
          {surveyRecord.skippedTeams?.length || 0} skipped
        {:else}
          Sorting by
          {#if surveyRecord.type == "match" && typeof sortBy == "number"}
            {surveyRecord.pickLists[sortBy].name}
          {:else}
            {sortBy}
          {/if}
        {/if}
      </span>
      <table class="w-full border-separate border-spacing-y-2">
        <thead class="sticky top-0 text-nowrap bg-neutral-900 align-bottom">
          <tr>
            {#if skippingTeams}
              <td class="w-0"></td>
            {/if}
            <th class="w-0 p-2 pl-0 pr-1">
              <Button onclick={() => (sortBy = "team")} class="w-full font-{sortBy == 'team' ? 'bold' : 'light'}">
                Team
              </Button>
            </th>
            {#if ranksPerPickList.length && surveyRecord.type == "match"}
              {#each surveyRecord.pickLists as pickList, i}
                {@const font = sortBy == i ? "font-bold" : "font-light"}
                <th class="w-0 p-2 px-1">
                  <Button onclick={() => (sortBy = i)} class="w-full justify-center {font}">
                    {pickList.name}
                  </Button>
                </th>
              {/each}
            {/if}
            <th class="w-0 p-2 pl-1 pr-0">
              <Button
                onclick={() => (sortBy = "done")}
                class="w-full justify-end font-{sortBy == 'done' ? 'bold' : 'light'}"
              >
                Done
              </Button>
            </th>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {#each teamInfos as teamInfo (teamInfo.team)}
            {@const onclick = () => {
              if (skippingTeams) {
                if (surveyRecord.type != "match") return;

                teamInfo.skipped = !teamInfo.skipped;

                if (!surveyRecord.skippedTeams) {
                  surveyRecord.skippedTeams = [teamInfo.team];
                } else if (surveyRecord.skippedTeams.includes(teamInfo.team)) {
                  surveyRecord.skippedTeams = surveyRecord.skippedTeams.filter((team) => team != teamInfo.team);
                } else {
                  surveyRecord.skippedTeams.push(teamInfo.team);
                }
              } else {
                openDialog(ViewTeamDialog, { surveyRecord, entryRecords, teamInfo, canEdit: true });
              }
            }}

            <tr
              tabindex="0"
              role="button"
              {onclick}
              onkeydown={(e) => {
                if (e.key == " " || e.key == "Enter") {
                  e.preventDefault();
                  onclick();
                }
              }}
              class="button cursor-pointer bg-neutral-800"
            >
              {#if skippingTeams}
                <td class="p-2">
                  {#if teamInfo.skipped}
                    <Icon name="forward" />
                  {:else}
                    <div class="h-[26px] w-[25px]"></div>
                  {/if}
                </td>
              {/if}
              <td class="p-2">{teamInfo.team}</td>
              {#if teamInfo.pickListRanks?.length}
                {#each teamInfo.pickListRanks as pickListRank}
                  <td class="p-2 text-center">
                    {#if pickListRank > 0}
                      {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
                    {:else if teamInfo.skipped}
                      <span class="text-neutral-500">----</span>
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
