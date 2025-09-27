<script lang="ts">
  import type { RankData } from "$lib/rank";
  import { getOrdinal, sessionStorageStore } from "$lib";
  import type { CompPageData } from "$lib/comp";
  import Anchor from "./Anchor.svelte";

  let {
    pageData,
    rankData,
  }: {
    pageData: CompPageData;
    rankData: RankData;
  } = $props();

  const highlightedTeam = sessionStorageStore<string>("team-highlight", "");
</script>

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each rankData.teams as teamRank}
    {@const color = `rgb(var(--theme-color) / ${teamRank.percentage.toFixed(2)}%)`}

    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      onclick={() => ($highlightedTeam = $highlightedTeam == teamRank.team ? "" : teamRank.team)}
      class="col-span-full grid grid-cols-subgrid"
    >
      <Anchor route="comp/{pageData.compRecord.id}/team/{teamRank.team}" class="justify-center text-sm">
        <div class="flex items-baseline">
          <span class="font-bold">{teamRank.rank}</span>
          <span class="hidden text-xs font-light sm:inline">{getOrdinal(teamRank.rank)}</span>
        </div>
      </Anchor>

      <div>
        <div
          class={[
            "flex items-end justify-between gap-3",
            $highlightedTeam == teamRank.team && "border-x-[6px] border-neutral-400 bg-neutral-800 px-1",
          ]}
        >
          <div class="flex flex-col">
            <span class="font-bold">{teamRank.team}</span>
            {#if teamRank.teamName}
              <span class={["text-xs", $highlightedTeam == teamRank.team || "font-light"]}>{teamRank.teamName}</span>
            {/if}
          </div>
          {#if "value" in teamRank}
            {teamRank.value.toFixed(2)}
          {:else}
            <span>{teamRank.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
          {/if}
        </div>
        <div class={$highlightedTeam == teamRank.team ? "bg-neutral-700" : "bg-neutral-800"}>
          <div style="background-color:{color};width:{teamRank.percentage.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    </div>
  {/each}
</div>
