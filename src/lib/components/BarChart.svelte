<script lang="ts">
  import Button from "./Button.svelte";
  import type { AnalysisData } from "$lib/analysis";
  import { getOrdinal, sessionStorageStore } from "$lib";
  import type { SurveyPageData } from "$lib/survey";
  import { goto } from "$app/navigation";

  let {
    pageData,
    analysisData,
  }: {
    pageData: SurveyPageData;
    analysisData: AnalysisData;
  } = $props();

  const teamView = sessionStorageStore<string>("team-view", "");
</script>

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each analysisData.data as teamData, rank}
    {@const color = `rgb(var(--theme-color) / ${teamData.percentage.toFixed(2)}%)`}

    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div onclick={() => ($teamView = teamData.team)} class="col-span-full grid grid-cols-subgrid">
      <Button onclick={() => goto(`#/survey/${pageData.surveyRecord.id}/teams`)} class="justify-center text-sm">
        <div class="flex items-baseline">
          <span class="font-bold">{rank + 1}</span>
          <span class="hidden text-xs font-light sm:inline">{getOrdinal(rank + 1)}</span>
        </div>
      </Button>

      <div>
        <div
          class={[
            "flex items-end justify-between gap-3",
            $teamView == teamData.team && "border-x-[6px] border-neutral-400 bg-neutral-800 px-1",
          ]}
        >
          <div class="flex flex-col">
            <span class="font-bold">{teamData.team}</span>
            {#if teamData.teamName}
              <span class={["text-xs", $teamView == teamData.team || "font-light"]}>{teamData.teamName}</span>
            {/if}
          </div>
          {#if "value" in teamData}
            {teamData.value.toFixed(2)}
          {:else}
            <span>{teamData.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
          {/if}
        </div>
        <div class={$teamView == teamData.team ? "bg-neutral-700" : "bg-neutral-800"}>
          <div style="background-color:{color};width:{teamData.percentage.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    </div>
  {/each}
</div>
