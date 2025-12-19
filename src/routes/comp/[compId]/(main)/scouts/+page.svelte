<script lang="ts">
  import type { PageProps } from "./$types";
  import Anchor from "$lib/components/Anchor.svelte";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6 mx-auto max-w-(--breakpoint-lg) w-full mt-[57px] px-3 py-6 max-lg:mb-[65px]">
  <h2 class="font-bold">Scouts</h2>

  {#if data.predictionsPerScout.length}
    <div
      class="-mx-1 grid gap-x-3 gap-y-2 overflow-x-auto px-1"
      style="grid-template-columns: repeat(7, min-content) auto;"
    >
      <div class="col-span-full grid grid-cols-subgrid items-end gap-x-4 px-2 text-center text-xs">
        <div class="text-left">Scout</div>
        <div>Adjusted</div>
        <div>Total</div>
        <div class="text-nowrap">Co-op</div>
        <div>Correct</div>
        <div>Accuracy</div>
      </div>

      {#each data.predictionsPerScout as { scout, entries, points, coopPoints, correctGuesses, accuracy, adjustedPoints }}
        <Anchor
          route="comp/{data.compRecord.id}/scout/{encodeURIComponent(scout)}"
          class="col-span-full grid grid-cols-subgrid"
        >
          <div class="w-24 truncate">{scout}</div>
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
  {:else}
    <span>No guesses.</span>
  {/if}
</div>
