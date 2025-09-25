<script lang="ts">
  import { getOrdinal, type Match } from "$lib";
  import {
    getExpressionData,
    getPickListData,
    type AnalysisTeamData,
    type PickList,
    type SelectedAnalysis,
  } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import { type MatchEntry } from "$lib/entry";
  import { type Expression } from "$lib/expression";
  import { getFieldsWithDetails } from "$lib/field";
  import type { CompPageData } from "$lib/comp";
  import { ChartBarBigIcon, ChevronDownIcon, ChevronUpIcon } from "@lucide/svelte";
  import { groupRanks, type MatchSurvey } from "$lib/survey";
  import Anchor from "./Anchor.svelte";

  let {
    pageData,
    match,
  }: {
    pageData: CompPageData;
    match: Match & { extraTeams?: string[] };
  } = $props();

  const redAlliance = $derived([match.red1, match.red2, match.red3].filter((team) => team));
  const blueAlliance = $derived([match.blue1, match.blue2, match.blue3].filter((team) => team));

  const matchSurveys = $derived(
    pageData.surveyRecords.filter((survey) => survey.type == "match").toSorted((a, b) => a.name.localeCompare(b.name)),
  );

  const groupedRanks = $derived(matchSurveys.flatMap(groupRanks));

  let selecting = $state(false);
  let selectedRanking = $state(initialRanking());

  function initialRanking(): SelectedAnalysis | undefined {
    const uniqueString = sessionStorage.getItem("analysis-view");
    if (!uniqueString) return;

    const [surveyId, type, name] = uniqueString.split("-", 3);
    const survey = matchSurveys.find((survey) => survey.id == surveyId);

    if (!survey) return;

    if (type == "picklist") {
      const pickList = survey.pickLists.find((pl) => pl.name == name);
      if (pickList) return getRanking({ survey, pickList });
    }

    if (type == "expression") {
      const expression = survey.expressions.find((e) => e.name == name);
      if (expression) return getRanking({ survey, expression });
    }
  }

  function switchRanking(params: Parameters<typeof getRanking>[0]) {
    selecting = false;
    scrollTo(0, 0);
    const value = getRanking(params);
    if (value) {
      sessionStorage.setItem("analysis-view", value?.uniqueString);
    }
    return value;
  }

  function getRanking(
    params: { survey: MatchSurvey; pickList: PickList } | { survey: MatchSurvey; expression: Expression },
  ): SelectedAnalysis | undefined {
    const entriesByTeam: Record<string, MatchEntry[]> = {};
    for (const entry of pageData.entryRecords.filter(
      (e): e is MatchEntry => e.surveyId == params.survey.id && e.type == "match",
    )) {
      if (entry.team in entriesByTeam) {
        entriesByTeam[entry.team].push(entry);
      } else {
        entriesByTeam[entry.team] = [entry];
      }
    }

    const fieldsWithDetails = getFieldsWithDetails(
      params.survey,
      pageData.fieldRecords.filter((field) => field.surveyId == params.survey.id),
    );

    if ("pickList" in params) {
      const output = getPickListData(
        pageData.compRecord,
        params.pickList.name,
        params.survey,
        entriesByTeam,
        fieldsWithDetails.orderedSingle,
      );

      return {
        ...params,
        entriesByTeam,
        output,
        uniqueString: `${params.survey.id}-picklist-${params.pickList.name}`,
      };
    }

    if ("expression" in params) {
      const output = getExpressionData(
        pageData.compRecord,
        params.expression.name,
        params.survey,
        entriesByTeam,
        fieldsWithDetails.orderedSingle,
      );

      return {
        ...params,
        entriesByTeam,
        output,
        uniqueString: `${params.survey.id}-expression-${params.expression.name}`,
      };
    }
  }
</script>

<div class="flex flex-col gap-4">
  <Button onclick={() => (selecting = !selecting)} class="text-sm">
    <ChartBarBigIcon class="text-theme size-5" />
    {#if selectedRanking}
      <span class="grow">
        {#if "pickList" in selectedRanking}
          {selectedRanking.pickList.name}
        {:else if "expression" in selectedRanking}
          {selectedRanking.expression.name}
        {/if}
      </span>
    {:else}
      <span class="grow">Select</span>
    {/if}

    {#if !selecting && selectedRanking}
      <ChevronDownIcon class="text-theme size-5" />
    {:else}
      <ChevronUpIcon class="text-theme size-5" />
    {/if}
  </Button>

  {#if !selecting && selectedRanking?.output}
    {@const pickListParam =
      selectedRanking.output.type == "picklist" &&
      "picklist=" + encodeURIComponent(selectedRanking.output.pickList.name)}
    {@const expressionParam =
      selectedRanking.output.type == "expression" &&
      "expression=" + encodeURIComponent(selectedRanking.output.expression.name)}
    {@const rankLinkParams = `surveyId=${encodeURIComponent(selectedRanking.survey.id)}&${pickListParam || expressionParam || ""}`}

    <div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
      {#each redAlliance as team}
        {@const teamData = selectedRanking.output.data.find((teamData) => teamData.team == team)}
        {#if teamData}
          {@render teamRow(teamData, "bg-red")}
        {/if}
      {/each}

      {#each blueAlliance as team}
        {@const teamData = selectedRanking.output.data.find((teamData) => teamData.team == team)}
        {#if teamData}
          {@render teamRow(teamData, "bg-blue")}
        {/if}
      {/each}

      {#each match.extraTeams || [] as team}
        {@const teamData = selectedRanking.output.data.find((teamData) => teamData.team == team)}
        {#if teamData}
          {@render teamRow(teamData, "bg-neutral-400")}
        {/if}
      {/each}
    </div>

    <Anchor route="comp/{pageData.compRecord.id}/rank?{rankLinkParams}" class="self-start text-sm">
      <ChartBarBigIcon class="text-theme size-5" />
      View rank
    </Anchor>

    {#snippet teamRow(teamData: AnalysisTeamData, bgColor: string)}
      {@const rank = selectedRanking?.output?.data.findIndex((td) => td.team == teamData.team)}

      <Anchor route="comp/{pageData.compRecord.id}/team/{teamData.team}" class="justify-center text-sm">
        <div class="flex items-baseline">
          {#if rank !== undefined}
            <span class="font-bold">{rank + 1}</span>
            <span class="hidden text-xs font-light sm:inline">{getOrdinal(rank + 1)}</span>
          {:else}
            -
          {/if}
        </div>
      </Anchor>

      <div>
        <div class="flex items-end justify-between gap-3">
          <div class="flex flex-col">
            <span class="font-bold">{teamData.team}</span>
            {#if teamData?.teamName}
              <span class="text-xs font-light">{teamData?.teamName}</span>
            {/if}
          </div>
          {#if teamData && "value" in teamData}
            {teamData.value.toFixed(2) || 0}
          {:else}
            <span>{teamData?.percentage.toFixed(1) || 0}<span class="text-sm">%</span></span>
          {/if}
        </div>
        <div class="bg-neutral-800">
          <div class={bgColor} style="width:{teamData?.percentage.toFixed(2) || 0}%;height:6px"></div>
        </div>
      </div>
    {/snippet}
  {:else}
    {#each groupedRanks as group}
      <div class="flex flex-col gap-2">
        <div class="flex flex-col">
          <h2 class="text-sm">{group.survey.name}</h2>
          <span class="text-xs font-light">{group.category}</span>
        </div>

        <div class="flex flex-wrap gap-2 text-sm">
          {#each group.pickLists || [] as pickList}
            {@const string = `${group.survey.id}-pickList-${pickList.name}`}
            <Button
              onclick={() => (selectedRanking = switchRanking({ survey: group.survey, pickList }))}
              class={selectedRanking?.uniqueString == string ? "font-bold underline" : ""}
            >
              {pickList.name}
            </Button>
          {/each}
          {#each group.expressions || [] as expression}
            {@const string = `${group.survey.id}-expression-${expression.name}`}
            <Button
              onclick={() => (selectedRanking = switchRanking({ survey: group.survey, expression }))}
              class={selectedRanking?.uniqueString == string ? "font-bold underline" : ""}
            >
              {expression.name}
            </Button>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
