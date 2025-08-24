<script lang="ts">
  import { getMatchTeamFontWeight, getOrdinal, type Match } from "$lib";
  import {
    getExpressionData,
    getPickListData,
    type AnalysisTeamData,
    type PickList,
    type SelectedAnalysis,
  } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import { type MatchEntry } from "$lib/entry";
  import { sortExpressions, type Expression } from "$lib/expression";
  import { getFieldsWithDetails } from "$lib/field";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";
  import { ChartBarBigIcon, ChevronDownIcon, ChevronUpIcon } from "@lucide/svelte";
  import ViewTeamDialog from "./ViewTeamDialog.svelte";
  import type { MatchSurvey } from "$lib/survey";

  let {
    pageData,
    match,
  }: {
    pageData: CompPageData;
    match: Match;
  } = $props();

  const matchSurveys = $derived(
    pageData.surveyRecords.filter((survey) => survey.type == "match").toSorted((a, b) => a.name.localeCompare(b.name)),
  );

  let selecting = $state(false);
  let selectedAnalysis = $state(initialAnalysis());

  $effect(() => {
    if (selectedAnalysis) {
      sessionStorage.setItem("analysis-view", selectedAnalysis.uniqueString);
    }
  });

  function initialAnalysis(): SelectedAnalysis | undefined {
    const uniqueString = sessionStorage.getItem("analysis-view");
    if (!uniqueString) return;

    const [surveyId, type, name] = uniqueString.split("-", 3);
    const survey = matchSurveys.find((survey) => survey.id == surveyId);

    if (!survey) return;

    if (type == "picklist") {
      const pickList = survey.pickLists.find((pl) => pl.name == name);
      if (pickList) return getAnalysis({ survey, pickList });
    }

    if (type == "expression") {
      const expression = survey.expressions.find((e) => e.name == name);
      if (expression) return getAnalysis({ survey, expression });
    }
  }

  function switchAnalysis(params: Parameters<typeof getAnalysis>[0]) {
    selecting = false;
    scrollTo(0, 0);
    return getAnalysis(params);
  }

  function getAnalysis(
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

<span>Match {match.number}</span>

<Button onclick={() => (selecting = !selecting)} class="text-sm">
  <ChartBarBigIcon class="text-theme size-5" />
  {#if !selecting}
    <span class="grow">
      {#if !selectedAnalysis}
        Team Info
      {:else if "pickList" in selectedAnalysis}
        {selectedAnalysis.pickList.name}
      {:else if "expression" in selectedAnalysis}
        {selectedAnalysis.expression.name}
      {/if}
    </span>
    <ChevronDownIcon class="text-theme size-5" />
  {:else}
    <span class="grow">Select</span>
    <ChevronUpIcon class="text-theme size-5" />
  {/if}
</Button>

<div class="-m-1 flex h-[384px] flex-col gap-3 overflow-auto p-1">
  {#if !selecting}
    <div class="grid gap-x-3 {selectedAnalysis ? 'gap-y-4' : 'gap-y-2'}" style="grid-template-columns:min-content auto">
      {#each [match.red1, match.red2, match.red3] as team}
        {@const teamData = selectedAnalysis?.output?.data.find((teamData) => teamData.team == team) ?? team}
        {@render teamRow("red", teamData)}
      {/each}

      {#each [match.blue1, match.blue2, match.blue3] as team}
        {@const teamData = selectedAnalysis?.output?.data.find((teamData) => teamData.team == team) ?? team}
        {@render teamRow("blue", teamData)}
      {/each}
    </div>

    {#snippet teamRow(alliance: "red" | "blue", team: string | AnalysisTeamData)}
      {#if typeof team == "string"}
        {@const teamName = pageData.compRecord.teams.find((t) => t.number == team)?.name || ""}

        <Button
          onclick={() => {
            openDialog(ViewTeamDialog, { team: { number: team, name: teamName }, pageData });
          }}
          class="col-span-full"
        >
          <div class="flex flex-col">
            {#if teamName}
              <span class="text-xs no-underline! {getMatchTeamFontWeight(team)}">{teamName}</span>
            {/if}
            <span class="{alliance == 'red' ? 'text-red' : 'text-blue'} {getMatchTeamFontWeight(team)}">{team}</span>
          </div>
        </Button>
      {:else}
        {@const rank = selectedAnalysis?.output?.data.findIndex((td) => td.team == team.team)}

        <Button
          onclick={() => {
            openDialog(ViewTeamDialog, { pageData, team: { number: team.team, name: team.teamName } });
          }}
          class="justify-center text-sm"
        >
          <div class="flex items-baseline">
            {#if rank !== undefined}
              <span class="font-bold">{rank + 1}</span>
              <span class="hidden text-xs font-light sm:inline">{getOrdinal(rank + 1)}</span>
            {:else}
              -
            {/if}
          </div>
        </Button>

        <div>
          <div class="flex items-end justify-between gap-3">
            <div class="flex flex-col">
              <span class="font-bold">{team.team}</span>
              {#if team?.teamName}
                <span class="text-xs font-light">{team?.teamName}</span>
              {/if}
            </div>
            {#if team && "value" in team}
              {team.value.toFixed(2) || 0}
            {:else}
              <span>{team?.percentage.toFixed(1) || 0}<span class="text-sm">%</span></span>
            {/if}
          </div>
          <div class="bg-neutral-800">
            <div
              class={alliance == "red" ? "bg-red" : "bg-blue"}
              style="width:{team?.percentage.toFixed(2) || 0}%;height:6px"
            ></div>
          </div>
        </div>
      {/if}
    {/snippet}
  {:else}
    <Button
      onclick={() => {
        selectedAnalysis = undefined;
        selecting = false;
      }}
      class="self-start text-sm {selectedAnalysis ? '' : 'font-bold underline'}"
    >
      Team Info
    </Button>

    {#each matchSurveys as survey (survey.id)}
      {@const sortedExpressions = survey.expressions.toSorted(sortExpressions)}

      {@const expressions = Object.groupBy(sortedExpressions, (e) => {
        if (e.scope == "entry" && e.input.from == "expressions") return "entryDerived";
        if (e.scope == "entry" && e.input.from == "tba") return "entryTba";
        if (e.scope == "entry" && e.input.from == "fields") return "entryPrimitive";
        if (e.scope == "survey" && e.input.from == "expressions") return "surveyDerived";
        if (e.scope == "survey" && e.input.from == "tba") return "surveyTba";
        if (e.scope == "survey" && e.input.from == "fields") return "surveyPrimitive";
        return "";
      })}

      {#if survey.pickLists.length}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col">
            <h2 class="font-bold">{survey.name}</h2>
            <span class="text-xs font-light">Pick Lists</span>
          </div>

          <div class="flex flex-wrap gap-2 text-sm">
            {#each survey.pickLists as pickList}
              {@const string = `${survey.id}-pickList-${pickList.name}`}
              <Button
                onclick={() => (selectedAnalysis = switchAnalysis({ survey, pickList }))}
                class={selectedAnalysis?.uniqueString == string ? "font-bold underline" : ""}
              >
                {pickList.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}

      {#if expressions.surveyDerived?.length}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col">
            <h2 class="font-bold">{survey.name}</h2>
            <span class="text-xs font-light">Survey Expressions from expressions</span>
          </div>

          <div class="flex flex-wrap gap-2 text-sm">
            {#each expressions.surveyDerived as expression}
              {@const string = `${survey.id}-expression-${expression.name}`}
              <Button
                onclick={() => (selectedAnalysis = switchAnalysis({ survey, expression }))}
                class={selectedAnalysis?.uniqueString == string ? "font-bold underline" : ""}
              >
                {expression.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}

      {#if expressions.surveyTba?.length}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col">
            <h2 class="font-bold">{survey.name}</h2>
            <span class="text-xs font-light">Survey Expressions from TBA</span>
          </div>

          <div class="flex flex-wrap gap-2 text-sm">
            {#each expressions.surveyTba as expression}
              {@const string = `${survey.id}-expression-${expression.name}`}
              <Button
                onclick={() => (selectedAnalysis = switchAnalysis({ survey, expression }))}
                class={selectedAnalysis?.uniqueString == string ? "font-bold underline" : ""}
              >
                {expression.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}

      {#if expressions.surveyPrimitive?.length}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col">
            <h2 class="font-bold">{survey.name}</h2>
            <span class="text-xs font-light">Survey Expressions from fields</span>
          </div>

          <div class="flex flex-wrap gap-2 text-sm">
            {#each expressions.surveyPrimitive as expression}
              {@const string = `${survey.id}-expression-${expression.name}`}
              <Button
                onclick={() => (selectedAnalysis = switchAnalysis({ survey, expression }))}
                class={selectedAnalysis?.uniqueString == string ? "font-bold underline" : ""}
              >
                {expression.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}

      {#if expressions.entryDerived?.length}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col">
            <h2 class="font-bold">{survey.name}</h2>
            <span class="text-xs font-light">Entry Expressions from expressions</span>
          </div>

          <div class="flex flex-wrap gap-2 text-sm">
            {#each expressions.entryDerived as expression}
              {@const string = `${survey.id}-expression-${expression.name}`}
              <Button
                onclick={() => (selectedAnalysis = switchAnalysis({ survey, expression }))}
                class={selectedAnalysis?.uniqueString == string ? "font-bold underline" : ""}
              >
                {expression.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}

      {#if expressions.entryTba?.length}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col">
            <h2 class="font-bold">{survey.name}</h2>
            <span class="text-xs font-light">Entry Expressions from TBA</span>
          </div>

          <div class="flex flex-wrap gap-2 text-sm">
            {#each expressions.entryTba as expression}
              {@const string = `${survey.id}-expression-${expression.name}`}
              <Button
                onclick={() => (selectedAnalysis = switchAnalysis({ survey, expression }))}
                class={selectedAnalysis?.uniqueString == string ? "font-bold underline" : ""}
              >
                {expression.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}

      {#if expressions.entryPrimitive?.length}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col">
            <h2 class="font-bold">{survey.name}</h2>
            <span class="text-xs font-light">Entry Expressions from fields</span>
          </div>

          <div class="flex flex-wrap gap-2 text-sm">
            {#each expressions.entryPrimitive as expression}
              {@const string = `${survey.id}-expression-${expression.name}`}
              <Button
                onclick={() => (selectedAnalysis = switchAnalysis({ survey, expression }))}
                class={selectedAnalysis?.uniqueString == string ? "font-bold underline" : ""}
              >
                {expression.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  {/if}
</div>
