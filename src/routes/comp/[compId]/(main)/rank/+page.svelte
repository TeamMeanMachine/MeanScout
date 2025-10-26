<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import type { PageProps } from "./$types";
  import { sessionStorageStore } from "$lib";
  import RaceChart from "$lib/components/RaceChart.svelte";
  import { ClipboardCopy, EyeIcon, EyeOffIcon, Share2Icon } from "@lucide/svelte";
  import BarChart from "$lib/components/BarChart.svelte";

  let { data }: PageProps = $props();

  const chartType = sessionStorageStore<"bar" | "race">("rank-chart-type", "bar");
  const hideAlliances = sessionStorageStore<"true" | "">("rank-hide-alliances", "true");
</script>

<div class="@container flex flex-col gap-6">
  <div class="flex flex-col flex-wrap gap-3 @sm:flex-row @sm:flex-wrap @sm:items-center @sm:justify-between">
    <div class="flex flex-col">
      <h2 class="font-bold">{data.title}</h2>
      <span class="text-xs font-light">{data.surveyRecord.name}</span>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
      {#if $chartType == "bar" && data.compRecord.alliances?.some((a) => a.teams.length)}
        <div class="flex gap-2 text-sm tracking-tighter">
          <Button
            onclick={() => ($hideAlliances = $hideAlliances ? "" : "true")}
            class={$hideAlliances ? "font-light" : "font-bold"}
          >
            {#if $hideAlliances}
              <EyeOffIcon class="text-theme size-5" />
            {:else}
              <EyeIcon class="text-theme size-5" />
            {/if}
            Alliances
          </Button>
        </div>
      {/if}

      <div class="flex gap-2 text-sm">
        <Button onclick={() => ($chartType = "bar")} class={$chartType == "bar" ? "font-bold" : "font-light"}>
          Bar
        </Button>
        <Button onclick={() => ($chartType = "race")} class={$chartType == "race" ? "font-bold" : "font-light"}>
          Race
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
    <BarChart pageData={data} rankData={data.output} hideAlliances={!!$hideAlliances} />
  {:else if $chartType == "race"}
    <RaceChart
      pageData={data}
      surveyRecord={data.surveyRecord}
      entriesByTeam={data.entriesByTeam}
      rankData={data.output}
    />
  {/if}
</div>
