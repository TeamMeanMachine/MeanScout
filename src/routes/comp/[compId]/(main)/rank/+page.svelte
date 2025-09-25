<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import type { PageProps } from "./$types";
  import { sessionStorageStore } from "$lib";
  import RaceChart from "$lib/components/RaceChart.svelte";
  import { ClipboardCopy, Share2Icon } from "@lucide/svelte";
  import StackedChart from "$lib/components/StackedChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";

  let { data }: PageProps = $props();

  const chartType = sessionStorageStore<"bar" | "race" | "stacked">("analysis-chart-type", "bar");
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <div class="flex flex-col">
      <h2 class="font-bold">{data.title}</h2>
      <span class="text-xs font-light">{data.surveyRecord.name}</span>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div class="flex gap-2 text-sm">
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

      <div class="flex gap-2">
        {#if "canShare" in navigator}
          <Button onclick={() => navigator.share({ text: data.output.text })}>
            <Share2Icon class="text-theme size-5" />
          </Button>
        {/if}

        {#if "clipboard" in navigator}
          <Button onclick={() => navigator.clipboard.writeText(data.output.text)}>
            <ClipboardCopy class="text-theme size-5" />
          </Button>
        {/if}
      </div>
    </div>
  </div>

  {#if $chartType == "bar"}
    <BarChart pageData={data} analysisData={data.output} />
  {:else if $chartType == "race"}
    <RaceChart
      pageData={data}
      surveyRecord={data.surveyRecord}
      entriesByTeam={data.entriesByTeam}
      analysisData={data.output}
    />
  {:else if $chartType == "stacked"}
    <StackedChart pageData={data} analysisData={data.output} />
  {/if}
</div>
