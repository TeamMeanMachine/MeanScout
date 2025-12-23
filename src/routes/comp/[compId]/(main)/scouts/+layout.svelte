<script lang="ts">
  import type { LayoutProps } from "./$types";
  import Anchor from "$lib/components/Anchor.svelte";

  let { data, children }: LayoutProps = $props();
</script>

<div
  class={[
    "lg:overflow-y-auto lg:overscroll-y-contain w-120 lg:h-[calc(100vh-57px)] lg:fixed lg:top-[57px] lg:border-r lg:border-neutral-600",
    "max-lg:max-w-(--breakpoint-lg) max-lg:w-full max-lg:mx-auto",
    data.scout ? "max-lg:hidden" : "max-lg:mb-[65px]",
  ]}
>
  <div class={["flex flex-col gap-3 px-3 py-6 bg-neutral-900", "sticky top-[57px] lg:top-0 z-20", "max-lg:mt-[57px]"]}>
    <h2 class="font-bold">Scouts</h2>
  </div>

  {#if data.predictionsPerScout.length}
    <div class={[data.scout ? "" : "max-lg:px-3"]}>
      <div
        class={["grid gap-x-3 gap-y-2 px-3 mb-3 max-lg:overflow-x-auto max-lg:-mx-3 max-lg:px-3"]}
        style="grid-template-columns: auto repeat(5, min-content);"
      >
        <div class="col-span-full grid grid-cols-subgrid items-end gap-x-4 px-2 text-center text-xs tracking-tighter">
          <div class="text-left">Scout</div>
          <div>Adjusted</div>
          <div>Total</div>
          <div class="text-nowrap">Co-op</div>
          <div>Correct</div>
          <div>Accuracy</div>
        </div>

        {#each data.predictionsPerScout as { scout, entries, points, coopPoints, correctGuesses, accuracy, adjustedPoints }}
          {@const viewing = scout == data.scout}
          <Anchor
            route="comp/{data.compRecord.id}/scouts/{encodeURIComponent(scout)}"
            class="col-span-full grid grid-cols-subgrid {viewing ? 'font-bold' : ''}"
          >
            <div class="min-w-24 truncate {viewing ? 'underline' : ''}">{scout}</div>
            <div class="text-center">{adjustedPoints.toFixed(2)}</div>
            <div class="text-center">{points}</div>
            <div class="text-center">{coopPoints}</div>
            <div class="text-center">{correctGuesses}<span class="text-xs font-light">/{entries.length}</span></div>
            <div class="text-center">{(accuracy * 100).toFixed(1)}<span class="text-xs font-light">%</span></div>
          </Anchor>
        {/each}

        <div class="col-span-full grid grid-cols-subgrid p-2 text-center text-sm">
          <div class="text-left">Overall</div>
          <div>{data.totalAdjustedPoints.toFixed(2)}</div>
          <div>{data.totalPoints}</div>
          <div>{data.totalCoopPoints}</div>
          <div>{data.totalCorrectGuesses}<span class="text-xs font-light">/{data.entryRecords.length}</span></div>
          <div>{(data.overallAccuracy * 100).toFixed(1)}<span class="text-xs font-light">%</span></div>
        </div>
      </div>
    </div>
  {:else}
    <span>No guesses.</span>
  {/if}
</div>

{@render children()}
