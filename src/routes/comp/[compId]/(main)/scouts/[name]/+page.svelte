<script lang="ts">
  import { CheckIcon } from "@lucide/svelte";
  import { compareMatches } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<div class="mt-[57px] flex grow flex-col gap-6 overflow-x-hidden px-3 py-6 max-lg:mb-[65px] lg:ml-120">
  <div class="flex flex-wrap gap-x-6 gap-y-3">
    <h2 class="w-full font-bold">{data.scout}</h2>

    <div class="flex flex-col">
      <span class="text-xs font-light">Adjusted</span>
      <span>{data.adjustedPoints.toFixed(2)}</span>
    </div>
    <div class="flex flex-col">
      <span class="text-xs font-light">Total</span>
      <span>{data.points}</span>
    </div>
    <div class="flex flex-col">
      <span class="text-xs font-light">Co-op</span>
      <span>{data.coopPoints}</span>
    </div>
    <div class="flex flex-col">
      <span class="text-xs font-light">Correct</span>
      <span>{data.correctGuesses}<span class="text-xs font-light">/{data.entries.length}</span></span>
    </div>
    <div class="flex flex-col">
      <span class="text-xs font-light">Accuracy</span>
      <span>{(data.accuracy * 100).toFixed(1)}<span class="text-xs font-light">%</span></span>
    </div>
  </div>

  {#if data.entries?.length}
    <div class="grid gap-x-3 gap-y-2" style="grid-template-columns: min-content min-content min-content auto">
      <div class="col-span-full grid grid-cols-subgrid items-end gap-x-3 px-2 text-center text-xs">
        <div>#</div>
        <div class="text-left">Guess</div>
        <div>Correct</div>
        <div class="text-left">Reason</div>
      </div>

      {#each data.entries as entry}
        {@const winner = data.predictionsPerMatch.find((m) => compareMatches(m, entry) == 0)?.winner}
        {@const predictionWeight = winner && winner == entry.prediction}
        {@const predictionColor =
          entry.prediction == "red" ? "text-red" : entry.prediction == "blue" ? "text-blue" : ""}

        <Button
          onclick={() => {
            openDialog(ViewEntryDialog, {
              compRecord: data.compRecord,
              surveyRecord: data.surveyRecords.find((survey) => survey.id == entry.surveyId)!,
              fieldRecords: data.fieldRecords,
              entryRecord: entry,
            });
          }}
          class="col-span-full grid grid-cols-subgrid gap-x-3 {predictionWeight}"
        >
          <div>
            {#if entry.matchLevel && entry.matchLevel != "qm"}
              {entry.matchLevel}{entry.matchSet || 1}-{entry.match}
            {:else}
              {entry.match}
            {/if}
          </div>
          <div class="text-nowrap capitalize {predictionColor}">{entry.prediction} wins</div>
          <div class="flex justify-center">
            {#if entry.prediction && entry.prediction == winner}
              <CheckIcon />
            {/if}
          </div>
          <div class="text-xs">{entry.predictionReason}</div>
        </Button>
      {/each}
    </div>
  {:else}
    <span>No entries.</span>
  {/if}
</div>
