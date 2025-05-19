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

  const tab = sessionStorageStore<"picklists" | "expressions">("analysis-tab", "picklists");
  const chartType = sessionStorageStore<"bar" | "race" | "stacked">("analysis-chart-type", "bar");

  const sortedExpressions = data.surveyRecord.expressions.toSorted(sortExpressions);

  const pickListName = sessionStorageStore("analysis-picklist", data.surveyRecord.pickLists[0]?.name || "");
  const expressionName = sessionStorageStore("analysis-expression", sortedExpressions[0]?.name || "");

  pickListName.subscribe((val) => {
    if (data.surveyRecord.pickLists.every((pl) => pl.name != val)) {
      pickListName.set(data.surveyRecord.pickLists[0]?.name || "");
    }
  });
  expressionName.subscribe((val) => {
    if (data.surveyRecord.expressions.every((e) => e.name != val)) {
      expressionName.set(sortedExpressions[0]?.name || "");
    }
  });

  const expressions = {
    entryDerived: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "expressions"),
    entryTba: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "tba"),
    entryPrimitive: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "fields"),
    surveyDerived: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "expressions"),
    surveyTba: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "tba"),
    surveyPrimitive: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "fields"),
  };

  let analysisData = $derived.by<AnalysisData | undefined>(() => {
    if ($tab == "picklists") {
      return getPickListData(
        $pickListName,
        data.surveyRecord,
        data.entriesByTeam,
        data.fieldsWithDetails.orderedSingle,
      );
    } else {
      return getExpressionData(
        $expressionName,
        data.surveyRecord,
        data.entriesByTeam,
        data.fieldsWithDetails.orderedSingle,
      );
    }
  });

  function tabClass(matching: string) {
    return $tab == matching ? "font-bold" : "font-light";
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

<div class="flex flex-col gap-3" style="view-transition-name:analysis">
  {#if !data.fieldRecords.length || !data.entryRecords.length || (!data.surveyRecord.pickLists.length && !data.surveyRecord.expressions.length)}
    <span class="text-sm">No analysis available.</span>
  {:else}
    <div class="flex flex-wrap justify-between gap-3">
      <div class="flex flex-wrap gap-2 text-sm">
        {#if data.surveyRecord.pickLists.length}
          <Button onclick={() => ($tab = "picklists")} class={tabClass("picklists")}>Pick Lists</Button>
        {/if}
        {#if data.surveyRecord.expressions.length}
          <Button onclick={() => ($tab = "expressions")} class={tabClass("expressions")}>Expressions</Button>
        {/if}
      </div>

      <div class="flex flex-wrap gap-2 self-end text-sm">
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
    </div>

    <div class="flex flex-wrap justify-between gap-2">
      {#if $tab == "picklists"}
        <select bind:value={$pickListName} class="text-theme bg-neutral-800 p-2">
          {#each data.surveyRecord.pickLists as pickList}
            <option>{pickList.name}</option>
          {/each}
        </select>
      {:else}
        <select bind:value={$expressionName} class="text-theme bg-neutral-800 p-2">
          {#if expressions.surveyDerived.length}
            <optgroup label="Survey Expressions from expressions">
              {#each expressions.surveyDerived as expression}
                <option>{expression.name}</option>
              {/each}
            </optgroup>
          {/if}
          {#if expressions.surveyTba.length}
            <optgroup label="Survey Expressions from TBA">
              {#each expressions.surveyTba as expression}
                <option>{expression.name}</option>
              {/each}
            </optgroup>
          {/if}
          {#if expressions.surveyPrimitive.length}
            <optgroup label="Survey Expressions from fields">
              {#each expressions.surveyPrimitive as expression}
                <option>{expression.name}</option>
              {/each}
            </optgroup>
          {/if}
          {#if expressions.entryDerived.length}
            <optgroup label="Entry Expressions from expressions">
              {#each expressions.entryDerived as expression}
                <option>{expression.name}</option>
              {/each}
            </optgroup>
          {/if}
          {#if expressions.entryTba.length}
            <optgroup label="Entry Expressions from TBA">
              {#each expressions.entryTba as expression}
                <option>{expression.name}</option>
              {/each}
            </optgroup>
          {/if}
          {#if expressions.entryPrimitive.length}
            <optgroup label="Entry Expressions from fields">
              {#each expressions.entryPrimitive as expression}
                <option>{expression.name}</option>
              {/each}
            </optgroup>
          {/if}
        </select>
      {/if}

      {#if analysisData}
        <div class="flex flex-wrap gap-2">
          {#if "canShare" in navigator}
            <Button onclick={() => navigator.share({ text: analysisData.text })}>
              <Share2Icon class="text-theme" />
              <span class="text-sm">Share</span>
            </Button>
          {/if}

          {#if "clipboard" in navigator}
            <Button onclick={() => navigator.clipboard.writeText(analysisData.text)}>
              <ClipboardCopy class="text-theme" />
              <span class="text-sm">Copy</span>
            </Button>
          {/if}
        </div>
      {/if}
    </div>

    {#if $tab == "picklists" && analysisData?.type == "picklist"}
      {#if $chartType == "bar"}
        <BarChart pageData={data} {analysisData} />
      {:else if $chartType == "race"}
        <RaceChart pageData={data} entriesByTeam={data.entriesByTeam} pickList={analysisData.pickList} />
      {:else if $chartType == "stacked"}
        <StackedChart {analysisData} />
      {/if}
    {:else if analysisData?.type == "expression"}
      {#if $chartType != "stacked"}
        <BarChart pageData={data} {analysisData} />
      {:else if $chartType == "stacked"}
        <StackedChart {analysisData} />
      {/if}
    {/if}
  {/if}
</div>
