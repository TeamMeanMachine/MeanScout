<script lang="ts">
  import type { AnalysisData } from "$lib/analysis";
  import { getOrdinal, sessionStorageStore } from "$lib";
  import type { CompPageData } from "$lib/comp";
  import Anchor from "./Anchor.svelte";

  let {
    pageData,
    analysisData,
  }: {
    pageData: CompPageData;
    analysisData: AnalysisData;
  } = $props();

  const highlightedTeam = sessionStorageStore<string>("team-highlight", "");
</script>

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each analysisData.data as teamData, rank}
    {@const color = `rgb(var(--theme-color) / ${teamData.percentage.toFixed(2)}%)`}

    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      onclick={() => ($highlightedTeam = $highlightedTeam == teamData.team ? "" : teamData.team)}
      class="col-span-full grid grid-cols-subgrid"
    >
      <Anchor route="comp/{pageData.compRecord.id}/team/{teamData.team}" class="justify-center text-sm">
        <div class="flex items-baseline">
          <span class="font-bold">{rank + 1}</span>
          <span class="hidden text-xs font-light sm:inline">{getOrdinal(rank + 1)}</span>
        </div>
      </Anchor>

      <div>
        <div
          class={[
            "flex items-end justify-between gap-3",
            $highlightedTeam == teamData.team && "border-x-[6px] border-neutral-400 bg-neutral-800 px-1",
          ]}
        >
          <div class="flex flex-col">
            <span class="font-bold">{teamData.team}</span>
            {#if teamData.teamName}
              <span class={["text-xs", $highlightedTeam == teamData.team || "font-light"]}>{teamData.teamName}</span>
            {/if}
          </div>
          {#if "value" in teamData}
            {teamData.value.toFixed(2)}
          {:else}
            <span>{teamData.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
          {/if}
        </div>
        <div class={$highlightedTeam == teamData.team ? "bg-neutral-700" : "bg-neutral-800"}>
          <div style="background-color:{color};width:{teamData.percentage.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    </div>
  {/each}
</div>
