<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import { getPickListData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import RaceChart from "$lib/components/RaceChart.svelte";
  import type { MatchEntry } from "$lib/entry";
  import { ClipboardCopy, Share2Icon } from "@lucide/svelte";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import BarChart from "$lib/components/BarChart.svelte";
  import StackedChart from "$lib/components/StackedChart.svelte";

  let {
    pageData,
    entriesByTeam,
    pickList,
  }: {
    pageData: Extract<PageData, { surveyType: "match" }>;
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    pickList: PickList;
  } = $props();

  const tab = sessionStorageStore<"bar" | "race" | "stacked">("analysis-chart-type", "bar");

  const pickListData = getPickListData(
    pickList.name,
    pageData.surveyRecord,
    entriesByTeam,
    pageData.fieldsWithDetails.orderedSingle,
  );

  let overflowDiv = $state<HTMLDivElement>();

  $effect(() => {
    $tab;
    overflowDiv?.scrollTo({ top: 0 });
  });
</script>

<strong>{pickList.name}</strong>

{#if pickListData?.data.length}
  <div class="flex flex-wrap items-end justify-between gap-3 text-sm">
    <div class="flex flex-wrap gap-2">
      <Button onclick={() => ($tab = "bar")} class={$tab == "bar" ? "font-bold" : "font-light"}>Bar</Button>
      <Button onclick={() => ($tab = "race")} class={$tab == "race" ? "font-bold" : "font-light"}>Race</Button>
      <Button onclick={() => ($tab = "stacked")} class={$tab == "stacked" ? "font-bold" : "font-light"}>Stacked</Button>
    </div>
    <div class="flex gap-2">
      {#if "canShare" in navigator}
        <Button onclick={() => navigator.share({ text: pickListData.text })}>
          <Share2Icon class="text-theme size-5" />
          Share
        </Button>
      {/if}

      {#if "clipboard" in navigator}
        <Button onclick={() => navigator.clipboard.writeText(pickListData.text)}>
          <ClipboardCopy class="text-theme size-5" />
          Copy
        </Button>
      {/if}
    </div>
  </div>

  <div bind:this={overflowDiv} class="-m-1 flex max-h-[500px] flex-col gap-4 overflow-y-auto p-1">
    {#if $tab == "bar"}
      <BarChart {pageData} analysisData={pickListData} />
    {:else if $tab == "race"}
      <RaceChart {pageData} {entriesByTeam} {pickList} />
    {:else if $tab == "stacked"}
      <StackedChart analysisData={pickListData} />
    {/if}
  </div>
{:else}
  <span class="text-sm">No analysis available.</span>
{/if}
