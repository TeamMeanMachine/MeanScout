<script lang="ts">
  import { getMatchTeamFontWeight, getOrdinal, type Match, type TeamInfo } from "$lib";
  import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import { type Entry } from "$lib/entry";
  import type { Expression } from "$lib/expression";
  import { getDetailedSingleFields } from "$lib/field";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import ViewTeamDialog from "./ViewTeamDialog.svelte";

  let {
    data,
    match,
  }: {
    data: PageData;
    match: Match;
  } = $props();

  let tab = $state<"picklists" | "survey" | "entry">("picklists");

  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);

  const entriesByTeam: Record<string, IDBRecord<Entry>[]> = {};
  for (const entry of data.entryRecords) {
    if (entry.team in entriesByTeam) {
      entriesByTeam[entry.team].push(entry);
    } else {
      entriesByTeam[entry.team] = [entry];
    }
  }

  const surveyExpressions =
    data.surveyType == "match" ? data.surveyRecord.expressions.filter((e) => e.scope == "survey") : undefined;
  const entryExpressions =
    data.surveyType == "match" ? data.surveyRecord.expressions.filter((e) => e.scope == "entry") : undefined;

  const teamInfos = getTeamInfosFromMatch(match);

  const showDoneColumn = teamInfos.some((teamInfo) => {
    return (
      teamInfo.entryCount &&
      data.entryRecords.some(
        (e) => e.status != "draft" && (e.type == "pit" || e.match == match.number) && e.team == teamInfo.number,
      )
    );
  });

  function getTeamInfosFromMatch(match: Match) {
    const teams = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];

    let ranksPerPickList: Record<string, number>[] | undefined = undefined;
    let ranksPerExpression: Record<string, number>[] | undefined = undefined;

    if (data.surveyType == "match") {
      ranksPerPickList = data.surveyRecord.pickLists.map(getPickListData);
      ranksPerExpression = data.surveyRecord.expressions.map(getExpressionData);
    }

    return teams.map((team): TeamInfo => {
      const entryCount = data.entryRecords.filter((entry) => entry.status != "draft" && entry.team == team).length;
      const pickListRanks = ranksPerPickList?.map((pickList) => pickList[team]);
      const expressionRanks = ranksPerExpression?.map((expression) => expression[team]);

      return {
        number: team,
        name: data.surveyRecord.teams.find((t) => t.number == team)?.name || "",
        entryCount,
        matchCount: 0,
        isCustom: data.surveyRecord.teams.some((t) => t.number == team),
        pickListRanks,
        expressionRanks,
      };
    });
  }

  function getPickListData(pickList: PickList) {
    if (data.surveyType != "match") return {};

    const pickListData = pickList.weights.reduce(
      (acc, weight) => {
        if (data.surveyRecord.type != "match") {
          return acc;
        }

        const teamData = calculateTeamData(weight.expressionName, data.surveyRecord.expressions, entriesByTeam, fields);
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
  }

  function getExpressionData(expression: Expression) {
    if (data.surveyType != "match") return {};

    const expressionData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      expressionData[team] = 0;
    }

    const teamData = calculateTeamData(expression.name, data.surveyRecord.expressions, entriesByTeam, fields);
    const normalizedTeamData = normalizeTeamData(teamData);

    for (const team in normalizedTeamData) {
      expressionData[team] += normalizedTeamData[team];
    }

    const sortedTeamRankings = Object.keys(expressionData)
      .map((team) => ({ team, percentage: normalizedTeamData[team] }))
      .toSorted((a, b) => b.percentage - a.percentage)
      .map((data, index) => ({ team: data.team, rank: index + 1 }));

    const rankPerTeam: Record<string, number> = {};
    for (const ranking of sortedTeamRankings) {
      rankPerTeam[ranking.team] = ranking.rank;
    }
    return rankPerTeam;
  }
</script>

<span>Match {match.number}</span>

{#if data.surveyType == "match"}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => (tab = "picklists")} class={tab == "picklists" ? "font-bold" : "font-light"}>
      Pick Lists
    </Button>
    <Button onclick={() => (tab = "survey")} class={tab == "survey" ? "font-bold" : "font-light"}>
      Survey Expressions
    </Button>
    <Button onclick={() => (tab = "entry")} class={tab == "entry" ? "font-bold" : "font-light"}>
      Entry Expressions
    </Button>
  </div>
{/if}

<div class="flex max-h-[500px] flex-col gap-2 overflow-auto">
  {#if data.surveyType == "match" && surveyExpressions && entryExpressions}
    {#if tab == "picklists"}
      <div
        class="m-1 grid gap-2"
        style="grid-template-columns: auto repeat({data.surveyRecord.pickLists.length +
          (showDoneColumn ? 1 : 0)}, min-content) 0"
      >
        <div
          class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid gap-2 gap-x-3 text-nowrap bg-neutral-900 text-sm font-bold"
        >
          <div class="sticky left-0 bg-neutral-900 pl-2">Team</div>
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
    {:else if tab == "survey"}
      <div
        class="m-1 grid gap-2"
        style="grid-template-columns: auto repeat({surveyExpressions.length + (showDoneColumn ? 1 : 0)}, min-content) 0"
      >
        <div
          class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid gap-2 gap-x-3 bg-neutral-900 text-sm font-bold"
        >
          <div class="sticky left-0 bg-neutral-900 pl-2">Team</div>
          {#if teamInfos.some((teamInfo) => teamInfo.expressionRanks?.length)}
            {#each surveyExpressions as expression}
              <div>{expression.name}</div>
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
    {:else if tab == "entry"}
      <div
        class="m-1 grid gap-2"
        style="grid-template-columns: auto repeat({entryExpressions.length + (showDoneColumn ? 1 : 0)}, min-content) 0"
      >
        <div
          class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid gap-2 gap-x-3 bg-neutral-900 text-sm font-bold"
        >
          <div class="sticky left-0 bg-neutral-900 pl-2">Team</div>
          {#if teamInfos.some((teamInfo) => teamInfo.expressionRanks?.length)}
            {#each entryExpressions as expression}
              <div>{expression.name}</div>
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
    {/if}
  {:else if data.surveyType == "pit"}
    <div class="m-1 grid gap-2" style="grid-template-columns: auto repeat({showDoneColumn ? 2 : 1}, min-content) 0">
      <div
        class="sticky top-0 z-20 col-span-full grid grid-cols-subgrid gap-2 gap-x-3 bg-neutral-900 text-sm font-bold"
      >
        <div class="sticky left-0 bg-neutral-900 pl-2">Team</div>
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
  {/if}
</div>

{#snippet teamRow(team: string, alliance: string)}
  {@const teamInfo = teamInfos.find((teamInfo) => teamInfo.number == team)}
  {@const entry = data.entryRecords.find(
    (e) => e.status != "draft" && (e.type == "pit" || e.match == match.number) && e.team == team,
  )}

  {#if teamInfo}
    <Button
      onclick={() => {
        openDialog(ViewTeamDialog, {
          data,
          teamInfo,
          entriesByTeam,
        });
      }}
      class="col-span-full grid grid-cols-subgrid gap-2 pl-0 text-center"
    >
      <div class="sticky left-0 flex flex-col bg-neutral-800 px-2 text-left">
        <span class="text-{alliance} {getMatchTeamFontWeight(teamInfo.number)}">{teamInfo.number}</span>
        {#if teamInfo.name}
          <small class="font-light">
            {teamInfo.name.replaceAll("Robotics", "").replaceAll("Team", "")}
          </small>
        {/if}
      </div>

      {#if data.surveyType == "match"}
        {#if tab == "picklists" && teamInfo.pickListRanks?.length}
          {#each teamInfo.pickListRanks as pickListRank}
            <div>
              {#if pickListRank > 0}
                {pickListRank}<small class="font-light">{getOrdinal(pickListRank)}</small>
              {/if}
            </div>
          {/each}
        {/if}

        {#if tab == "survey" && teamInfo.expressionRanks?.length}
          {@const surveyExpressionRanks = teamInfo.expressionRanks.filter(
            (_, i) => data.surveyRecord.expressions[i].scope == "survey",
          )}
          {#each surveyExpressionRanks as expressionRank}
            <div>
              {#if expressionRank > 0}
                {expressionRank}<small class="font-light">{getOrdinal(expressionRank)}</small>
              {/if}
            </div>
          {/each}
        {/if}

        {#if tab == "entry" && teamInfo.expressionRanks?.length}
          {@const entryExpressionRanks = teamInfo.expressionRanks.filter(
            (_, i) => data.surveyRecord.expressions[i].scope == "entry",
          )}
          {#each entryExpressionRanks as expressionRank}
            <div>
              {#if expressionRank > 0}
                {expressionRank}<small class="font-light">{getOrdinal(expressionRank)}</small>
              {/if}
            </div>
          {/each}
        {/if}
      {:else if data.surveyType == "pit"}{/if}

      <div>
        {#if entry}
          <Icon name="check" />
        {/if}
      </div>
    </Button>
  {/if}
{/snippet}
