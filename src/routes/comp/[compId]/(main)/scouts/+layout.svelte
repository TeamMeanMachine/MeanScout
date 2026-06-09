<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();
</script>

<div
  class={[
    "lg:fixed lg:top-14.25 lg:h-[calc(100vh-57px)] lg:w-100 lg:overflow-y-auto lg:overscroll-y-contain lg:border-r lg:border-neutral-600",
    data.scoutName ? "max-lg:hidden" : "max-lg:mb-16.25",
  ]}
>
  {#if !data.predictionsPerScout.length}
    <div class="mx-3 my-6 text-xs">No guesses.</div>
  {:else}
    <div
      class="grid gap-x-3 gap-y-2 p-3 pt-4.5 pb-6 max-lg:mt-14.25 max-lg:overflow-x-auto"
      style="grid-template-columns: auto repeat(3, min-content);"
    >
      <div class="col-span-full grid grid-cols-subgrid items-center px-2 text-center font-light tracking-tighter">
        <div class="-ml-2 text-left text-base font-bold tracking-normal">Scouts</div>
        <div>
          <div class="text-sm font-normal tracking-normal">Adjusted</div>
          <div class="text-xs">Total</div>
        </div>
        <div class="text-xs text-nowrap">Co-op</div>
        <div class="m">
          <div class="text-sm font-normal tracking-normal">
            {data.totalCorrectGuesses}<span class="text-xs font-light">/{data.entriesWithPredictions.length}</span>
          </div>
          <div class="text-xs font-normal tracking-normal">
            {(data.overallAccuracy * 100).toFixed(1)}<span class="text-xs font-light">%</span>
          </div>
        </div>
      </div>

      {#each data.predictionsPerScout as { scout, entries, points, coopPoints, correctGuesses, accuracy, adjustedPoints }}
        {@const viewing = scout.name == data.scoutName && scout.team == data.scoutTeam}
        {@const urlParams = scout.team ? `?team=${encodeURIComponent(scout.team)}` : ""}

        <Anchor
          route="comp/{data.compRecord.id}/scouts/{encodeURIComponent(scout.name)}{urlParams}"
          class="col-span-full grid grid-cols-subgrid {viewing ? 'font-bold' : ''}"
        >
          <div class="flex min-w-24 flex-col truncate">
            <div class={["truncate", viewing && "underline"]}>{scout.name}</div>
            {#if scout.team}
              <span class="text-xs font-light">{scout.team}</span>
            {/if}
          </div>
          <div class="text-center">
            {adjustedPoints.toFixed(2)}
            <div class="text-xs font-light">{points}</div>
          </div>
          <div class="text-center text-xs">{coopPoints}</div>
          <div class="text-center">
            {correctGuesses}<span class="text-xs font-light">/{entries.length}</span>
            <div class="text-xs font-light">{(accuracy * 100).toFixed(1)}%</div>
          </div>
        </Anchor>
      {/each}
    </div>
  {/if}
</div>

{@render children()}
