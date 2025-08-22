<script lang="ts">
  import { getMatchTeamFontWeight, getOrdinal, type Match } from "$lib";
  import { getExpressionData, getPickListData, type AnalysisData, type AnalysisTeamData } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import { type MatchEntry } from "$lib/entry";
  import { sortExpressions } from "$lib/expression";
  import { getFieldsWithDetails } from "$lib/field";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";
  import ViewTeamDialog from "./ViewTeamDialog.svelte";

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

  const showAnalysis = $derived(matchSurveys.some((survey) => survey.pickLists.length || survey.expressions.length));

  let selectedSurveyId = $state(defaultSurveyId());

  const selectedSurvey = $derived.by(() => {
    if (!selectedSurveyId) return defaultSurvey();
    return matchSurveys.find((survey) => survey.id == selectedSurveyId) || defaultSurvey();
  });

  const sortedExpressions = $derived(selectedSurvey?.expressions.toSorted(sortExpressions));

  const expressions = $derived(
    sortedExpressions
      ? Object.groupBy(sortedExpressions, (e) => {
          if (e.scope == "entry" && e.input.from == "expressions") return "entryDerived";
          if (e.scope == "entry" && e.input.from == "tba") return "entryTba";
          if (e.scope == "entry" && e.input.from == "fields") return "entryPrimitive";
          if (e.scope == "survey" && e.input.from == "expressions") return "surveyDerived";
          if (e.scope == "survey" && e.input.from == "tba") return "surveyTba";
          if (e.scope == "survey" && e.input.from == "fields") return "surveyPrimitive";
          return "";
        })
      : undefined,
  );

  const entriesByTeam = $derived.by(() => {
    const record: Record<string, MatchEntry[]> = {};

    for (const entry of pageData.entryRecords.filter(
      (e): e is MatchEntry => e.surveyId == selectedSurveyId && e.type == "match",
    )) {
      if (entry.team in record) {
        record[entry.team].push(entry);
      } else {
        record[entry.team] = [entry];
      }
    }

    return record;
  });

  const fieldsWithDetails = $derived.by(() => {
    if (!selectedSurvey) return;
    return getFieldsWithDetails(
      selectedSurvey,
      pageData.fieldRecords.filter((field) => field.surveyId == selectedSurveyId),
    );
  });

  let selectedAnalysisString = $state(defaultAnalysisString());

  const selectedAnalysis = $derived.by(() => {
    if (!selectedAnalysisString) return defaultAnalysis();
    const [type, name] = selectedAnalysisString.split("-", 2);

    if (type == "picklist") {
      const pickList = selectedSurvey?.pickLists.find((pl) => pl.name == name);
      if (pickList) return { type: "picklist" as const, pickList };
    } else if (type == "expression") {
      const expression = sortedExpressions?.find((e) => e.name == name);
      if (expression) return { type: "expression" as const, expression };
    }

    return defaultAnalysis();
  });

  const analysisData = $derived.by<AnalysisData | undefined>(() => {
    if (!selectedSurvey || !fieldsWithDetails) return;
    if (selectedAnalysis?.type == "picklist") {
      return getPickListData(
        pageData.compRecord,
        selectedAnalysis.pickList.name,
        selectedSurvey,
        entriesByTeam,
        fieldsWithDetails.orderedSingle,
      );
    } else if (selectedAnalysis?.type == "expression") {
      return getExpressionData(
        pageData.compRecord,
        selectedAnalysis.expression.name,
        selectedSurvey,
        entriesByTeam,
        fieldsWithDetails.orderedSingle,
      );
    }
  });

  $effect(() => {
    if (!selectedSurveyId) return;
    sessionStorage.setItem("analysis-survey", selectedSurveyId);
  });

  $effect(() => {
    if (!selectedAnalysisString) return;
    sessionStorage.setItem("analysis-view", selectedAnalysisString);
  });

  function defaultSurvey() {
    if (matchSurveys.length) {
      return matchSurveys[0];
    }
  }

  function defaultSurveyId() {
    const value = sessionStorage.getItem("analysis-survey");

    if (value) {
      return value;
    }

    if (matchSurveys.length) {
      return matchSurveys[0].id;
    }
  }

  function defaultAnalysis() {
    if (selectedSurvey?.pickLists.length) {
      return { type: "picklist" as const, pickList: selectedSurvey.pickLists[0] };
    }

    if (sortedExpressions?.length) {
      return { type: "expression" as const, expression: sortedExpressions[0] };
    }
  }

  function defaultAnalysisString() {
    const value = sessionStorage.getItem("analysis-view");

    if (value) {
      const [type, name] = value.split("-", 2);

      if (
        (type == "picklist" && selectedSurvey?.pickLists.some((pl) => pl.name == name)) ||
        (type == "expression" && sortedExpressions?.some((e) => e.name == name))
      ) {
        return value;
      }
    }

    if (selectedSurvey?.pickLists.length) {
      return "picklist-" + selectedSurvey?.pickLists[0].name;
    }

    if (sortedExpressions?.length) {
      return "expression-" + sortedExpressions[0].name;
    }
  }
</script>

<span>Match {match.number}</span>

{#if showAnalysis}
  <div class="flex flex-wrap gap-2 text-sm">
    {#if matchSurveys.length > 1}
      <select bind:value={selectedSurveyId} class="text-theme bg-neutral-800 p-2">
        {#each matchSurveys as survey (survey.id)}
          <option value={survey.id}>{survey.name}</option>
        {/each}
      </select>
    {/if}
    <select bind:value={selectedAnalysisString} class="text-theme min-w-0 grow bg-neutral-800 p-2">
      {#if selectedSurvey?.pickLists.length}
        <optgroup label="Pick Lists">
          {#each selectedSurvey.pickLists as pickList}
            <option value="picklist-{pickList.name}">{pickList.name}</option>
          {/each}
        </optgroup>
      {/if}
      {#if expressions?.surveyDerived?.length}
        <optgroup label="Survey Expressions from expressions">
          {#each expressions.surveyDerived as expression}
            <option value="expression-{expression.name}">{expression.name}</option>
          {/each}
        </optgroup>
      {/if}
      {#if expressions?.surveyTba?.length}
        <optgroup label="Survey Expressions from TBA">
          {#each expressions.surveyTba as expression}
            <option value="expression-{expression.name}">{expression.name}</option>
          {/each}
        </optgroup>
      {/if}
      {#if expressions?.surveyPrimitive?.length}
        <optgroup label="Survey Expressions from fields">
          {#each expressions.surveyPrimitive as expression}
            <option value="expression-{expression.name}">{expression.name}</option>
          {/each}
        </optgroup>
      {/if}
      {#if expressions?.entryDerived?.length}
        <optgroup label="Entry Expressions from expressions">
          {#each expressions.entryDerived as expression}
            <option value="expression-{expression.name}">{expression.name}</option>
          {/each}
        </optgroup>
      {/if}
      {#if expressions?.entryTba?.length}
        <optgroup label="Entry Expressions from TBA">
          {#each expressions.entryTba as expression}
            <option value="expression-{expression.name}">{expression.name}</option>
          {/each}
        </optgroup>
      {/if}
      {#if expressions?.entryPrimitive?.length}
        <optgroup label="Entry Expressions from fields">
          {#each expressions.entryPrimitive as expression}
            <option value="expression-{expression.name}">{expression.name}</option>
          {/each}
        </optgroup>
      {/if}
    </select>
  </div>
{/if}

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each [match.red1, match.red2, match.red3] as team}
    {@const teamData = analysisData?.data.find((teamData) => teamData.team == team) ?? team}
    {@render teamRow("red", teamData)}
  {/each}

  {#each [match.blue1, match.blue2, match.blue3] as team}
    {@const teamData = analysisData?.data.find((teamData) => teamData.team == team) ?? team}
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
    {@const rank = analysisData?.data.findIndex((td) => td.team == team.team)}

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
