<script lang="ts">
  import type { Match, TeamInfo } from "$lib";
  import { calculateTeamData, normalizeTeamData } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import type { MatchEntry } from "$lib/entry";
  import { getDetailedSingleFields } from "$lib/field";
  import { teamStore } from "$lib/settings";
  import type { PageData } from "../../routes/survey/[surveyId]/matches/$types";
  import ViewTeamDialog from "./ViewTeamDialog.svelte";

  let {
    data,
    match,
  }: {
    data: PageData;
    match: Match;
  } = $props();

  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);

  const entriesByTeam = data.entryRecords.reduce(
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

  let showDoneColumn = $derived(
    teamInfos.some((teamInfo) => {
      return (
        teamInfo.entryCount &&
        data.entryRecords.some((e) => e.status != "draft" && e.match == match.number && e.team == teamInfo.number)
      );
    }),
  );

  function getTeamInfosFromMatch(match: Match) {
    const ranksPerPickList = data.surveyRecord.pickLists.map((pickList) => {
      const pickListData = pickList.weights.reduce(
        (acc, weight) => {
          if (data.surveyRecord.type != "match") {
            return acc;
          }

          const teamData = calculateTeamData(
            weight.expressionName,
            data.surveyRecord.expressions,
            entriesByTeam,
            fields,
          );
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
      const matchingEntries = data.entryRecords.filter((entry) => entry.status != "draft" && entry.team == team);
      const ranks = ranksPerPickList.map((pickList) => pickList[team]);
      return {
        number: team,
        name: data.surveyRecord.teams.find((t) => t.number == team)?.name || "",
        entryCount: matchingEntries.length,
        matchCount: 0,
        isCustom: data.surveyRecord.teams.some((t) => t.number == team),
        pickListRanks: ranksPerPickList.length ? ranks : undefined,
      };
    });

    return teamInfos.filter((teamInfo) => {
      return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].includes(teamInfo.number);
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

  function getFontWeight(team: string) {
    if (!$teamStore) return "";
    if (team == $teamStore) return "font-bold underline";
    return "font-light";
  }
</script>

<div class="flex flex-col">
  <span>Match {match.number}</span>
  <div
    class="grid gap-2 pt-2"
    style="grid-template-columns: auto repeat({data.surveyRecord.pickLists.length +
      (showDoneColumn ? 1 : 0)}, min-content) 0"
  >
    <div class="col-span-full grid grid-cols-subgrid gap-2 gap-x-3 text-nowrap text-sm font-bold">
      <div class="pl-2">Team</div>
      {#if teamInfos.some((teamInfo) => teamInfo.pickListRanks?.length)}
        {#each data.surveyRecord.pickLists as pickList}
          <div>{pickList.name}</div>
        {/each}
      {/if}
      {#if showDoneColumn}
        <div class="">Done</div>
      {/if}
    </div>

    {#each [match.red1, match.red2, match.red3] as team}
      {@render teamRow(team, "red")}
    {/each}
    {#each [match.blue1, match.blue2, match.blue3] as team}
      {@render teamRow(team, "blue")}
    {/each}
  </div>
</div>

{#snippet teamRow(team: string, alliance: string)}
  {@const teamInfo = teamInfos.find((teamInfo) => teamInfo.number == team)}
  {@const entry = data.entryRecords.find((e) => e.status != "draft" && e.match == match.number && e.team == team)}

  {#if teamInfo}
    <Button
      onclick={() => {
        openDialog(ViewTeamDialog, {
          data: data as any,
          teamInfo,
        });
      }}
      class="col-span-full grid grid-cols-subgrid gap-2 text-center"
    >
      <div class="flex flex-col text-left">
        <span class="text-{alliance} {getFontWeight(teamInfo.number)}">{teamInfo.number}</span>
        {#if teamInfo.name}
          <small class="font-light">
            {teamInfo.name.replaceAll("Robotics", "").replaceAll("Team", "")}
          </small>
        {/if}
      </div>
      {#if teamInfo.pickListRanks?.length}
        {#each teamInfo.pickListRanks as pickListRank}
          <div>
            {#if pickListRank > 0}
              {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
            {/if}
          </div>
        {/each}
      {/if}
      <div>
        {#if entry}
          <Icon name="check" />
        {/if}
      </div>
    </Button>
  {/if}
{/snippet}
