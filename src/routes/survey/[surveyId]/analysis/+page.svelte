<script lang="ts">
  import { sortExpressions } from "$lib/expression";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import type { PageData } from "./$types";
  import { sessionStorageStore } from "$lib";
  import { type AnalysisData, getExpressionData, getPickListData } from "$lib/analysis";
  import RaceChart from "$lib/components/RaceChart.svelte";
  import { ClipboardCopy, Share2Icon } from "@lucide/svelte";
  import StackedChart from "$lib/components/StackedChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const chartType = sessionStorageStore<"bar" | "race" | "stacked">("analysis-chart-type", "bar");
  const sortedExpressions = data.surveyRecord.expressions.toSorted(sortExpressions);

  const expressions = Object.groupBy(sortedExpressions, (e) => {
    if (e.scope == "entry" && e.input.from == "expressions") return "entryDerived";
    if (e.scope == "entry" && e.input.from == "tba") return "entryTba";
    if (e.scope == "entry" && e.input.from == "fields") return "entryPrimitive";
    if (e.scope == "survey" && e.input.from == "expressions") return "surveyDerived";
    if (e.scope == "survey" && e.input.from == "tba") return "surveyTba";
    if (e.scope == "survey" && e.input.from == "fields") return "surveyPrimitive";
    return "";
  });

  let selectedString = $state(defaultSelectionString());

  let selected = $derived.by(() => {
    if (!selectedString) return defaultSelection();
    const [type, name] = selectedString.split("-", 2);

    if (type == "picklist") {
      const pickList = data.surveyRecord.pickLists.find((pl) => pl.name == name);
      if (pickList) return { type: "picklist" as const, pickList };
    } else if (type == "expression") {
      const expression = data.surveyRecord.expressions.find((e) => e.name == name);
      if (expression) return { type: "expression" as const, expression };
    }

    return defaultSelection();
  });

  let analysisData = $derived.by<AnalysisData | undefined>(() => {
    if (selected?.type == "picklist") {
      return getPickListData(
        selected.pickList.name,
        data.surveyRecord,
        data.entriesByTeam,
        data.fieldsWithDetails.orderedSingle,
      );
    } else if (selected?.type == "expression") {
      return getExpressionData(
        selected.expression.name,
        data.surveyRecord,
        data.entriesByTeam,
        data.fieldsWithDetails.orderedSingle,
      );
    }
  });

  $effect(() => {
    if (!selectedString) return;
    sessionStorage.setItem("analysis-view", selectedString);
  });

  function defaultSelection() {
    if (data.surveyRecord.pickLists.length) {
      return { type: "picklist" as const, pickList: data.surveyRecord.pickLists[0] };
    }

    if (sortedExpressions.length) {
      return { type: "expression" as const, expression: sortedExpressions[0] };
    }
  }

  function defaultSelectionString() {
    const value = sessionStorage.getItem("analysis-view");

    if (value) {
      const [type, name] = value.split("-", 2);

      if (
        (type == "picklist" && data.surveyRecord.pickLists.some((pl) => pl.name == name)) ||
        (type == "expression" && sortedExpressions.some((e) => e.name == name))
      ) {
        return value;
      }
    }

    if (data.surveyRecord.pickLists.length) {
      return "picklist-" + data.surveyRecord.pickLists[0].name;
    }

    if (sortedExpressions.length) {
      return "expression-" + sortedExpressions[0].name;
    }
  }
</script>

<Header
  title="Analysis - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Analysis" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-6" style="view-transition-name:analysis">
  {#if !data.fieldRecords.length || !data.entryRecords.length || (!data.surveyRecord.pickLists.length && !data.surveyRecord.expressions.length)}
    <span class="text-sm">No analysis available.</span>
  {:else}
    <div class="flex flex-wrap gap-4">
      <select bind:value={selectedString} class="text-theme min-w-0 grow bg-neutral-800 p-2">
        {#if data.surveyRecord.pickLists.length}
          <optgroup label="Pick Lists">
            {#each data.surveyRecord.pickLists as pickList}
              <option value="picklist-{pickList.name}">{pickList.name}</option>
            {/each}
          </optgroup>
        {/if}
        {#if expressions.surveyDerived?.length}
          <optgroup label="Survey Expressions from expressions">
            {#each expressions.surveyDerived as expression}
              <option value="expression-{expression.name}">{expression.name}</option>
            {/each}
          </optgroup>
        {/if}
        {#if expressions.surveyTba?.length}
          <optgroup label="Survey Expressions from TBA">
            {#each expressions.surveyTba as expression}
              <option value="expression-{expression.name}">{expression.name}</option>
            {/each}
          </optgroup>
        {/if}
        {#if expressions.surveyPrimitive?.length}
          <optgroup label="Survey Expressions from fields">
            {#each expressions.surveyPrimitive as expression}
              <option value="expression-{expression.name}">{expression.name}</option>
            {/each}
          </optgroup>
        {/if}
        {#if expressions.entryDerived?.length}
          <optgroup label="Entry Expressions from expressions">
            {#each expressions.entryDerived as expression}
              <option value="expression-{expression.name}">{expression.name}</option>
            {/each}
          </optgroup>
        {/if}
        {#if expressions.entryTba?.length}
          <optgroup label="Entry Expressions from TBA">
            {#each expressions.entryTba as expression}
              <option value="expression-{expression.name}">{expression.name}</option>
            {/each}
          </optgroup>
        {/if}
        {#if expressions.entryPrimitive?.length}
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

    {#if analysisData}
      {#if $chartType == "bar"}
        <BarChart pageData={data} {analysisData} />
      {:else if $chartType == "race"}
        {#key analysisData}
          <RaceChart pageData={data} entriesByTeam={data.entriesByTeam} {analysisData} />
        {/key}
      {:else if $chartType == "stacked"}
        <StackedChart pageData={data} {analysisData} />
      {/if}
    {/if}
  {/if}
</div>
