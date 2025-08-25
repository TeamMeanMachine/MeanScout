<script lang="ts">
  import { sortExpressions, type Expression } from "$lib/expression";
  import Button from "$lib/components/Button.svelte";
  import type { PageProps } from "./$types";
  import { sessionStorageStore } from "$lib";
  import { getExpressionData, getPickListData, type PickList, type SelectedAnalysis } from "$lib/analysis";
  import RaceChart from "$lib/components/RaceChart.svelte";
  import { ChartBarBigIcon, ChevronDownIcon, ChevronUpIcon, ClipboardCopy, Share2Icon } from "@lucide/svelte";
  import StackedChart from "$lib/components/StackedChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";
  import CompPageHeader from "../CompPageHeader.svelte";
  import { getFieldsWithDetails } from "$lib/field";
  import type { MatchEntry } from "$lib/entry";
  import type { MatchSurvey } from "$lib/survey";

  let { data }: PageProps = $props();

  const chartType = sessionStorageStore<"bar" | "race" | "stacked">("analysis-chart-type", "bar");

  const matchSurveys = data.surveyRecords
    .filter((survey) => survey.type == "match")
    .toSorted((a, b) => a.name.localeCompare(b.name));

  const showAnalysis =
    data.fieldRecords.length &&
    data.entryRecords.length &&
    matchSurveys.some((survey) => survey.pickLists.length || survey.expressions.length);

  let selecting = $state(false);
  let selectedAnalysis = $state(initialAnalysis());

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
    const value = getAnalysis(params);
    if (value) {
      sessionStorage.setItem("analysis-view", value?.uniqueString);
    }
    return value;
  }

  function getAnalysis(
    params: { survey: MatchSurvey; pickList: PickList } | { survey: MatchSurvey; expression: Expression },
  ): SelectedAnalysis | undefined {
    const entriesByTeam: Record<string, MatchEntry[]> = {};
    for (const entry of data.entryRecords.filter(
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
      data.fieldRecords.filter((field) => field.surveyId == params.survey.id),
    );

    if ("pickList" in params) {
      const output = getPickListData(
        data.compRecord,
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
        data.compRecord,
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

<CompPageHeader pageData={data} page="analysis" pageTitle="Analysis" />

<div class="flex flex-col gap-6 max-md:mt-9 max-md:mb-20" style="view-transition-name:analysis">
  {#if !showAnalysis}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold md:hidden">Analysis</h2>
      <span class="text-sm">No analysis available.</span>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold md:hidden">Analysis</h2>

      <div class="flex flex-col gap-4">
        <Button onclick={() => (selecting = !selecting)} class="grow">
          <ChartBarBigIcon class="text-theme" />

          {#if selectedAnalysis}
            <span class="grow">
              {#if "pickList" in selectedAnalysis}
                {selectedAnalysis.pickList.name}
              {:else if "expression" in selectedAnalysis}
                {selectedAnalysis.expression.name}
              {/if}
            </span>
          {:else}
            <span class="grow">Select</span>
          {/if}

          {#if !selecting && selectedAnalysis}
            <ChevronDownIcon class="text-theme" />
          {:else}
            <ChevronUpIcon class="text-theme" />
          {/if}
        </Button>

        {#if !selecting && selectedAnalysis?.output?.text}
          <div class="flex flex-wrap justify-between gap-4 text-sm">
            <div class="flex gap-2">
              <Button onclick={() => ($chartType = "bar")} class={$chartType == "bar" ? "font-bold" : "font-light"}>
                Bar
              </Button>
              <Button onclick={() => ($chartType = "race")} class={$chartType == "race" ? "font-bold" : "font-light"}>
                Race
              </Button>
              <Button
                onclick={() => ($chartType = "stacked")}
                class={$chartType == "stacked" ? "font-bold" : "font-light"}
              >
                Stacked
              </Button>
            </div>

            <div class="flex gap-2">
              {#if "canShare" in navigator}
                <Button onclick={() => navigator.share({ text: selectedAnalysis!.output!.text })} class="flex-nowrap!">
                  <Share2Icon class="text-theme size-5" />
                  <span>Share</span>
                </Button>
              {/if}

              {#if "clipboard" in navigator}
                <Button
                  onclick={() => navigator.clipboard.writeText(selectedAnalysis!.output!.text)}
                  class="flex-nowrap!"
                >
                  <ClipboardCopy class="text-theme size-5" />
                  <span>Copy</span>
                </Button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if !selecting && selectedAnalysis?.output}
      {#if $chartType == "bar"}
        <BarChart pageData={data} analysisData={selectedAnalysis.output} />
      {:else if $chartType == "race"}
        <RaceChart
          pageData={data}
          surveyRecord={selectedAnalysis.survey}
          entriesByTeam={selectedAnalysis.entriesByTeam}
          analysisData={selectedAnalysis.output}
        />
      {:else if $chartType == "stacked"}
        <StackedChart pageData={data} analysisData={selectedAnalysis.output} />
      {/if}
    {:else}
      {#each matchSurveys as survey}
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
  {/if}
</div>
