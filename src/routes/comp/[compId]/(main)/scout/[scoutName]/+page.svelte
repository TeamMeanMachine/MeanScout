<script lang="ts">
  import type { PageProps } from "./$types";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import { CheckIcon } from "@lucide/svelte";

  let { data }: PageProps = $props();

  function winLoseWeight(winner: "red" | "blue" | undefined, matching: "red" | "blue" | undefined) {
    return winner && winner == matching ? "font-bold" : "font-light";
  }
</script>

<div class="flex flex-col gap-6">
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
        {@const winner = data.predictionsPerMatch.find((m) => m.number == entry.match)?.winner}
        {@const predictionWeight = winLoseWeight(winner, entry.prediction)}
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
          <div>{entry.match}</div>
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
