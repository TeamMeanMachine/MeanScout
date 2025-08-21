<script lang="ts">
  import { sortExpressions } from "$lib/expression";
  import Button from "$lib/components/Button.svelte";
  import type { PageProps } from "./$types";
  import { sessionStorageStore } from "$lib";
  import { type AnalysisData, getExpressionData, getPickListData } from "$lib/analysis";
  import RaceChart from "$lib/components/RaceChart.svelte";
  import { ClipboardCopy, Share2Icon } from "@lucide/svelte";
  import StackedChart from "$lib/components/StackedChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";
  import CompPageHeader from "../CompPageHeader.svelte";
  import { getFieldsWithDetails } from "$lib/field";
  import type { MatchEntry } from "$lib/entry";

  let { data }: PageProps = $props();

  const chartType = sessionStorageStore<"bar" | "race" | "stacked">("analysis-chart-type", "bar");

  const matchSurveys = $derived(
    data.surveyRecords
      .filter((survey) => survey.type == "match")
      .toSorted((a, b) => b.modified.getTime() - a.modified.getTime()),
  );

  const showAnalysisWidget = $derived(
    matchSurveys.some((survey) => survey.pickLists.length || survey.expressions.length),
  );

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

    for (const entry of data.entryRecords.filter(
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
      data.fieldRecords.filter((field) => field.surveyId == selectedSurveyId),
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
        data.compRecord,
        selectedAnalysis.pickList.name,
        selectedSurvey,
        entriesByTeam,
        fieldsWithDetails.orderedSingle,
      );
    } else if (selectedAnalysis?.type == "expression") {
      return getExpressionData(
        data.compRecord,
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

<CompPageHeader compRecord={data.compRecord} surveyRecords={data.surveyRecords} page="analysis" pageTitle="Analysis" />

<div class="flex flex-col gap-6" style="view-transition-name:analysis">
  {#if !data.fieldRecords.length || !data.entryRecords.length || !showAnalysisWidget}
    <span class="text-sm">No analysis available.</span>
  {:else}
    <div class="flex flex-wrap gap-4">
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

      <div class="flex flex-wrap gap-4">
        <div class="flex flex-wrap gap-2 text-sm">
          <Button onclick={() => ($chartType = "bar")} class={$chartType == "bar" ? "font-bold" : "font-light"}>
            Bar
          </Button>
          <Button onclick={() => ($chartType = "race")} class={$chartType == "race" ? "font-bold" : "font-light"}>
            Race
          </Button>
          <Button onclick={() => ($chartType = "stacked")} class={$chartType == "stacked" ? "font-bold" : "font-light"}>
            Stacked
          </Button>
        </div>

        {#if analysisData}
          <div class="flex flex-wrap gap-2">
            {#if "canShare" in navigator}
              <Button onclick={() => navigator.share({ text: analysisData.text })}>
                <Share2Icon class="text-theme size-5" />
                <span class="text-sm">Share</span>
              </Button>
            {/if}

            {#if "clipboard" in navigator}
              <Button onclick={() => navigator.clipboard.writeText(analysisData.text)}>
                <ClipboardCopy class="text-theme size-5" />
                <span class="text-sm">Copy</span>
              </Button>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    {#if analysisData && selectedSurvey}
      {#if $chartType == "bar"}
        <BarChart pageData={data} {analysisData} />
      {:else if $chartType == "race"}
        {#key analysisData}
          <RaceChart pageData={data} surveyRecord={selectedSurvey} {entriesByTeam} {analysisData} />
        {/key}
      {:else if $chartType == "stacked"}
        <StackedChart pageData={data} {analysisData} />
      {/if}
    {/if}
  {/if}
</div>
