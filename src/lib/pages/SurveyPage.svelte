<script lang="ts">
  import type { Match, TeamInfo } from "$lib";
  import { type PickList, calculateTeamData, normalizeTeamData } from "$lib/analysis";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import NewEntryDialog from "$lib/dialogs/NewEntryDialog.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import ViewPickListDialog from "$lib/dialogs/ViewPickListDialog.svelte";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecord,
    entryRecords,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  let viewPickListDialog = $state<ViewPickListDialog | undefined>();
  let viewMatchDialog = $state<ViewMatchDialog | undefined>();

  const drafts = entryRecords
    .filter((entry) => entry.status == "draft")
    .toSorted((a, b) => b.modified.getTime() - a.modified.getTime());

  const teamsFromMatches = getTeamsFromMatches();
  const matchCountPerTeam = getMatchCountPerTeam(teamsFromMatches);
  const entriesByTeam = getEntriesByTeam();
  const ranksPerPickList = surveyRecord.pickLists.map(createTeamRanking);

  const uniqueTeams = [...new Set([...surveyRecord.teams, ...teamsFromMatches])];
  const teamInfos = uniqueTeams.map(createTeamInfo);

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

<Header backLink="">
  <h1 class="font-bold">{surveyRecord.name}</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Entries</h2>

  <NewEntryDialog {idb} bind:surveyRecord {entryRecords} />

  {#if drafts.length}
    {#each drafts as draft (draft.id)}
      <Anchor route="entry/{draft.id}">
        <div class="flex grow flex-col">
          <span><small>Team</small> {draft.team}</span>
          {#if draft.type == "match"}
            <span><small>Match</small> {draft.match}</span>
          {/if}
        </div>
        <Icon name="arrow-right" />
      </Anchor>
    {/each}
  {/if}

  <Anchor route="survey/{surveyRecord.id}/entries">
    <Icon name="list-ol" />
    <div class="flex grow flex-col">
      Entries
      <small>{entryRecords.length - drafts.length} completed</small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>
</div>

{#if surveyRecord.type == "match"}
  {@const matchesScouted = surveyRecord.matches.filter((match) => {
    const teams = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
    return entryRecords.find(
      (e) => e.type == "match" && e.status != "draft" && teams.includes(e.team) && e.match == match.number,
    );
  }).length}

  {@const entriesByTeam = entryRecords.reduce(
    (acc, entry) => {
      if (entry.type != "match") return acc;

      if (entry.team in acc) {
        acc[entry.team] = [...acc[entry.team], entry];
      } else {
        acc[entry.team] = [entry];
      }
      return acc;
    },
    {} as Record<string, IDBRecord<MatchEntry>[]>,
  )}

  {@const upcomingMatches = surveyRecord.matches
    .filter((match) => !entryRecords.find((e) => e.status != "draft" && e.type == "match" && e.match == match.number))
    .toSorted((a, b) => a.number - b.number)
    .slice(0, 3)}

  {@const previousMatches = surveyRecord.matches
    .map((match) => ({
      ...match,
      done: entryRecords.filter((e) => e.status != "draft" && e.type == "match" && e.match == match.number).length,
    }))
    .filter((match) => match.done)
    .toSorted((a, b) => b.number - a.number)
    .slice(0, 3)}

  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Analysis</h2>

    <ViewPickListDialog bind:this={viewPickListDialog} bind:surveyRecord {entriesByTeam} />

    {#each surveyRecord.pickLists as pickList, index}
      <Button onclick={() => viewPickListDialog?.open(index)}>
        {pickList.name}
      </Button>
    {/each}

    <Anchor route="survey/{surveyRecord.id}/analysis">
      <Icon name="chart-simple" />
      <div class="flex grow flex-col">
        Analysis
        <small>
          {surveyRecord.pickLists.length} pick {surveyRecord.pickLists.length == 1 ? "list" : "lists"},
          {surveyRecord.expressions.length}
          {surveyRecord.expressions.length == 1 ? "expression" : "expressions"}
        </small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>
  </div>

  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Matches</h2>

    <ViewMatchDialog
      bind:this={viewMatchDialog}
      {surveyRecord}
      entryRecords={entryRecords as IDBRecord<MatchEntry>[]}
      {ranksPerPickList}
    />

    <div class="flex flex-wrap gap-2">
      {#snippet teamRow(match: Match)}
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
      {/snippet}

      <div class="flex grow flex-col">
        <small>Upcoming</small>
        <table class="border-separate border-spacing-y-2 text-center">
          <tbody>
            {#each upcomingMatches as match}
              {@render teamRow(match)}
            {/each}
          </tbody>
        </table>
      </div>

      <div class="flex grow flex-col">
        <small>Previous</small>
        <table class="border-separate border-spacing-y-2 text-center">
          <tbody>
            {#each previousMatches as match}
              {@render teamRow(match)}
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <Anchor route="survey/{surveyRecord.id}/matches">
      <Icon name="table-list" />
      <div class="flex grow flex-col">
        Matches
        <small>
          {#if matchesScouted > 0}
            {matchesScouted} scouted,
          {/if}
          {surveyRecord.matches.length} total
        </small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>
  </div>
{/if}

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Teams</h2>

  <Anchor route="survey/{surveyRecord.id}/teams">
    <Icon name="people-group" />
    <div class="flex grow flex-col">
      Teams
      <small>
        {#if surveyRecord.type == "match"}
          {@const teamCountFromMatches = [
            ...new Set(
              surveyRecord.matches.flatMap((match) => [
                match.red1,
                match.red2,
                match.red3,
                match.blue1,
                match.blue2,
                match.blue3,
              ]),
            ),
          ].length}
          {teamCountFromMatches} from matches,
        {/if}
        {surveyRecord.teams.length} custom
      </small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>
</div>

{#if $modeStore == "admin"}
  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Admin</h2>

    <Anchor route="survey/{surveyRecord.id}/fields">
      <Icon name="list-check" />
      <div class="flex grow flex-col">
        Fields
        <small>
          {#if surveyRecord.expressions.length == 0 && surveyRecord.pickLists.length == 0 && entryRecords.length == 0}
            Configure,
          {/if}
          Preview
        </small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>

    <Anchor route="survey/{surveyRecord.id}/options">
      <Icon name="gears" />
      <div class="flex grow flex-col">
        Options
        <small>Export, TBA event</small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>
  </div>
{/if}
