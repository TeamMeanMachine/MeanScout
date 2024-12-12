<script lang="ts">
  import type { Match, TeamInfo } from "$lib";
  import { calculateTeamData, normalizeTeamData } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import type { MatchEntry } from "$lib/entry";
  import { getDetailedSingleFields, type Field } from "$lib/field";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import DeleteMatchDialog from "./DeleteMatchDialog.svelte";
  import EditMatchDialog from "./EditMatchDialog.svelte";
  import ViewTeamDialog from "./ViewTeamDialog.svelte";

  let {
    surveyRecord,
    fieldRecords,
    entryRecords,
    match,
    canEdit,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fieldRecords: IDBRecord<Field>[];
    entryRecords: IDBRecord<MatchEntry>[];
    match: Match;
    canEdit?: boolean;
  } = $props();

  const fields = getDetailedSingleFields(surveyRecord, fieldRecords);

  const entriesByTeam = entryRecords.reduce(
    (acc, entry) => {
      if (entry.type != "match") return acc;

      if (entry.team in acc) {
        acc[entry.team].push(entry);
      } else {
        acc[entry.team] = [entry];
      }

      return acc;
    },
    {} as Record<string, IDBRecord<MatchEntry>[]>,
  );

  let teamInfos = $derived(getTeamInfosFromMatch(match));

  function getTeamInfosFromMatch(match: Match) {
    const ranksPerPickList = surveyRecord.pickLists.map((pickList) => {
      const pickListData = pickList.weights.reduce(
        (acc, weight) => {
          if (surveyRecord.type != "match") {
            return acc;
          }

          const teamData = calculateTeamData(weight.expressionName, surveyRecord.expressions, entriesByTeam, fields);
          const normalizedTeamData = normalizeTeamData(teamData, weight.percentage);
          for (const team in normalizedTeamData) {
            if (team in acc) {
              acc[team] += normalizedTeamData[team];
            } else {
              acc[team] = normalizedTeamData[team];
            }
          }
          return acc;
        },
        {} as Record<string, number>,
      );

      const normalizedPickListData = normalizeTeamData(pickListData);

      const sortedTeamRankings = Object.keys(pickListData)
        .map((team) => ({ team, percentage: normalizedPickListData[team] }))
        .toSorted((a, b) => b.percentage - a.percentage)
        .map((data, index) => ({ team: data.team, rank: index + 1 }));

      return sortedTeamRankings.reduce(
        (acc, ranking) => {
          acc[ranking.team] = ranking.rank;
          return acc;
        },
        {} as Record<string, number>,
      );
    });

    const teams = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];

    const teamInfos: TeamInfo[] = teams.map((team) => {
      const matchingEntries = entryRecords.filter((entry) => entry.status != "draft" && entry.team == team);
      const ranks = ranksPerPickList.map((pickList) => pickList[team]);
      return {
        team,
        entryCount: matchingEntries.length,
        matchCount: 0,
        isCustom: surveyRecord.teams.includes(team),
        pickListRanks: ranksPerPickList.length ? ranks : undefined,
      };
    });

    return teamInfos.filter((teamInfo) => {
      return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].includes(teamInfo.team);
    });
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

{#snippet teamRow(team: string, alliance: string)}
  {@const teamInfo = teamInfos.find((teamInfo) => teamInfo.team == team)}
  {@const entry = entryRecords.find((e) => e.status != "draft" && e.match == match.number && e.team == team)}

  {#if teamInfo}
    {@const onclick = () => openDialog(ViewTeamDialog, { surveyRecord, fieldRecords, entryRecords, teamInfo })}

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
      <td class="p-2 text-{alliance}">{teamInfo.team}</td>
      {#if teamInfo.pickListRanks?.length}
        {#each teamInfo.pickListRanks as pickListRank}
          <td class="p-2">
            {#if pickListRank > 0}
              {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
            {/if}
          </td>
        {/each}
      {/if}
      <td class="p-2">
        {#if entry}
          <Icon name="check" />
        {/if}
      </td>
      <td></td>
    </tr>
  {/if}
{/snippet}

<div class="flex flex-col">
  <span>Match {match.number}</span>
  <table class="border-separate border-spacing-y-2 text-center">
    <thead class="text-nowrap">
      <tr>
        <th class="w-0 p-2">Team</th>
        {#if teamInfos.some((teamInfo) => teamInfo.pickListRanks?.length)}
          {#each surveyRecord.pickLists as pickList}
            <th class="w-0 p-2">{pickList.name}</th>
          {/each}
        {/if}
        <th class="w-0 p-2">Done</th>
        <td></td>
      </tr>
    </thead>
    <tbody>
      {#each [match.red1, match.red2, match.red3] as team}
        {@render teamRow(team, "red")}
      {/each}
      {#each [match.blue1, match.blue2, match.blue3] as team}
        {@render teamRow(team, "blue")}
      {/each}
    </tbody>
  </table>
</div>

{#if $modeStore == "admin" && canEdit}
  <Button onclick={() => openDialog(EditMatchDialog, { surveyRecord, match })}>
    <Icon name="pen" />
    Edit
  </Button>
  <Button onclick={() => openDialog(DeleteMatchDialog, { surveyRecord, number: match.number, ondelete: closeDialog })}>
    <Icon name="trash" />
    Delete
  </Button>
{/if}
