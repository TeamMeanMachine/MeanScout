<script lang="ts">
  import type { Match, TeamInfo } from "$lib";
  import { type PickList, calculateTeamData, normalizeTeamData } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import DeleteMatchDialog from "$lib/dialogs/DeleteMatchDialog.svelte";
  import UpsertMatchDialog from "$lib/dialogs/UpsertMatchDialog.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecords,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<MatchSurvey>;
    entryRecords: IDBRecord<MatchEntry>[];
  } = $props();

  let viewMatchDialog: ViewMatchDialog | undefined = $state();
  let upsertMatchDialog: UpsertMatchDialog | undefined = $state();
  let deleteMatchDialog: DeleteMatchDialog | undefined = $state();

  const teamsFromMatches = getTeamsFromMatches();
  const matchCountPerTeam = getMatchCountPerTeam(teamsFromMatches);
  const entriesByTeam = getEntriesByTeam();
  const ranksPerPickList = surveyRecord.pickLists.map(createTeamRanking);

  let teamInfos = $derived.by(() => {
    const uniqueTeams = [...new Set([...surveyRecord.teams, ...teamsFromMatches])];
    return uniqueTeams.map(createTeamInfo);
  });

  let upcomingMatches = $derived(
    surveyRecord.matches
      .filter((match) => !entryRecords.find((e) => e.status != "draft" && e.match == match.number))
      .toSorted((a, b) => a.number - b.number),
  );

  let previousMatches = $derived.by(() => {
    return surveyRecord.matches
      .map((match) => ({
        ...match,
        done: entryRecords.filter((e) => e.status != "draft" && e.match == match.number).length,
      }))
      .filter((match) => match.done)
      .toSorted((a, b) => b.number - a.number);
  });

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

  function getTeamInfosFromMatch(match: Match) {
    return teamInfos.filter((teamInfo) => {
      return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].includes(teamInfo.team);
    });
  }
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Matches</h1>
</Header>

<ViewMatchDialog
  bind:this={viewMatchDialog}
  bind:surveyRecord
  {entryRecords}
  {ranksPerPickList}
  {upsertMatchDialog}
  {deleteMatchDialog}
/>
<UpsertMatchDialog bind:this={upsertMatchDialog} bind:surveyRecord />
<DeleteMatchDialog bind:this={deleteMatchDialog} bind:surveyRecord ondelete={() => viewMatchDialog?.close()} />

<div class="flex flex-col gap-2 p-3">
  {#if $modeStore == "admin"}
    <Button onclick={() => upsertMatchDialog?.newMatch()} classes="mb-2">
      <Icon name="plus" />
      New match
    </Button>
  {/if}

  {#if upcomingMatches.length}
    <div class="flex flex-col">
      <h2 class="font-bold">Upcoming</h2>
      <table class="border-separate border-spacing-y-2 text-center">
        <thead>
          <tr>
            <th class="px-2">#</th>
            <th colspan="3" class="px-2">Teams</th>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {#each upcomingMatches as match}
            <tr
              tabindex="0"
              role="button"
              onclick={() => viewMatchDialog?.open(match, getTeamInfosFromMatch(match))}
              onkeydown={(e) => {
                if (e.key == " " || e.key == "Enter") {
                  e.preventDefault();
                  viewMatchDialog?.open(match, getTeamInfosFromMatch(match));
                }
              }}
              class="button cursor-pointer bg-neutral-800"
            >
              <td class="w-0 p-2">{match.number}</td>
              <td class="w-0 space-y-0.5 p-2">
                <div class="text-red">{match.red1}</div>
                <div class="text-blue">{match.blue1}</div>
              </td>
              <td class="w-0 space-y-0.5 p-2">
                <div class="text-red">{match.red2}</div>
                <div class="text-blue">{match.blue2}</div>
              </td>
              <td class="w-0 space-y-0.5 p-2">
                <div class="text-red">{match.red3}</div>
                <div class="text-blue">{match.blue3}</div>
              </td>
              <td></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if previousMatches.length}
    <div class="flex flex-col">
      <h2 class="font-bold">Previous</h2>
      <table class="border-separate border-spacing-y-2 text-center">
        <thead>
          <tr>
            <th class="px-2">#</th>
            <th colspan="3" class="px-2">Teams</th>
            <th class="px-2">Done</th>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {#each previousMatches as match}
            <tr
              tabindex="0"
              role="button"
              onclick={() => viewMatchDialog?.open(match, getTeamInfosFromMatch(match))}
              onkeydown={(e) => {
                if (e.key == " " || e.key == "Enter") {
                  e.preventDefault();
                  viewMatchDialog?.open(match, getTeamInfosFromMatch(match));
                }
              }}
              class="button cursor-pointer bg-neutral-800"
            >
              <td class="w-0 p-2">{match.number}</td>
              <td class="w-0 space-y-0.5 p-2">
                <div class="text-red">{match.red1}</div>
                <div class="text-blue">{match.blue1}</div>
              </td>
              <td class="w-0 space-y-0.5 p-2">
                <div class="text-red">{match.red2}</div>
                <div class="text-blue">{match.blue2}</div>
              </td>
              <td class="w-0 space-y-0.5 p-2">
                <div class="text-red">{match.red3}</div>
                <div class="text-blue">{match.blue3}</div>
              </td>
              <td class="w-0 p-2">{match.done || ""}</td>
              <td></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    No matches.
  {/if}
</div>
