<script lang="ts">
  import type { PageData } from "./$types";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { sessionStorageStore } from "$lib";
  import { openDialog } from "$lib/dialog";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const tab = sessionStorageStore<"scouts" | "matches">("predictions-tab", "scouts");

  let selectedScout = $state<string | undefined>();
  let selectedMatch = $state<number | undefined>();

  function winLoseWeight(winner: "red" | "blue" | undefined, matching: "red" | "blue" | undefined) {
    return winner && winner == matching ? "font-bold" : "text-sm font-light";
  }

  function pointPercentage(points: number) {
    if (data.totalPoints == 0) return "0%";
    return (points / data.totalPoints) * 100 + "%";
  }
</script>

<Header
  title="Predictions - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Predictions" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-6" style="view-transition-name:predictions">
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "scouts")} class={$tab == "scouts" ? "font-bold" : "font-light"}>Scouts</Button>
    <Button onclick={() => ($tab = "matches")} class={$tab == "matches" ? "font-bold" : "font-light"}>Matches</Button>
  </div>

  {#if $tab == "scouts" && data.scouts.length}
    <div class="grid gap-2" style="grid-template-columns: repeat(4, min-content) auto;">
      <div class="col-span-full grid grid-cols-subgrid items-end gap-x-4 px-2 text-center text-sm">
        <div class="text-left">Scout</div>
        <div>Points</div>
        <div class=" text-nowrap">% Total</div>
        <div>Correct Guesses</div>
      </div>

      {#each data.scouts as { scout, entries, points, correctGuesses }}
        <Button
          onclick={() => {
            if (selectedScout == scout) {
              selectedScout = undefined;
            } else {
              selectedScout = scout;
            }
          }}
          class="col-span-full grid grid-cols-subgrid {selectedScout == scout ? 'font-bold' : 'font-light'}"
        >
          <div>{scout}</div>
          <div class="text-center">{points.toFixed(1)}</div>
          <div class="text-center">{pointPercentage(points)}</div>
          <div class="text-center">{correctGuesses}</div>
        </Button>

        {#if selectedScout == scout && entries.length}
          <div class="col-span-full mb-2 ml-2 flex max-h-[500px] flex-col gap-2 overflow-y-auto p-1 text-sm">
            <div class="grid gap-x-3 gap-y-2" style="grid-template-columns: min-content min-content auto">
              {#each entries as entry}
                {@const predictionWeight = winLoseWeight(
                  data.matches.find((m) => m.number == entry.match)?.winner,
                  entry.prediction,
                )}

                <Button
                  onclick={() => {
                    openDialog(ViewEntryDialog, {
                      surveyRecord: data.surveyRecord,
                      fieldRecords: data.fieldRecords,
                      entryRecord: entry,
                    });
                  }}
                  class="col-span-full grid grid-cols-subgrid gap-x-3 {predictionWeight}"
                >
                  <div>{entry.match}</div>
                  <div class="capitalize text-{entry.prediction} text-nowrap">
                    {entry.prediction} wins
                  </div>
                  <div>{entry.predictionReason}</div>
                </Button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}

      <div class="col-span-full grid grid-cols-subgrid p-2 text-center text-sm">
        <div></div>
        <div>{data.totalPoints.toFixed(1)}</div>
        <div>{data.totalPoints ? "100%" : "0%"}</div>
        <div>{data.totalCorrectGuesses}</div>
      </div>
    </div>
  {:else if $tab == "matches" && data.matches.length}
    <div class="grid gap-x-4 gap-y-3" style="grid-template-columns: repeat(9, min-content) auto;">
      <div class="col-span-full grid grid-cols-subgrid text-center text-sm">
        <div>#</div>
        <div>Red</div>
        <div class="col-span-6">Predictions</div>
        <div>Blue</div>
      </div>

      {#each data.matches as { number, redScore, blueScore, winner, redEntries, blueEntries, predictedEntryCount }}
        <Button
          onclick={() => {
            if (selectedMatch == number) {
              selectedMatch = undefined;
            } else {
              selectedMatch = number;
            }
          }}
          class="col-span-full grid grid-cols-subgrid gap-x-4"
        >
          <div class="text-center {selectedMatch == number ? 'font-bold' : 'font-light'}">{number}</div>
          <div class="text-end">
            <span class="text-red {winLoseWeight(winner, 'red')}">{redScore}</span>
          </div>
          <div class="col-span-6 grid grid-cols-subgrid gap-x-3">
            {#each redEntries as { scout, prediction }}
              <div class="text-center">
                <span class="text-{prediction} {winLoseWeight(winner, prediction)}">{scout}</span>
              </div>
            {/each}
            {#each { length: 6 - predictedEntryCount }}
              <div></div>
            {/each}
            {#each blueEntries as { scout, prediction }}
              <div class="text-center">
                <span class="text-{prediction} {winLoseWeight(winner, prediction)}">{scout}</span>
              </div>
            {/each}
          </div>
          <div>
            <span class="text-blue {winLoseWeight(winner, 'blue')}">{blueScore}</span>
          </div>
        </Button>

        {#if selectedMatch == number}
          <div
            class="col-span-full mb-2 ml-2 grid gap-x-3 gap-y-2 text-sm"
            style="grid-template-columns: min-content min-content auto"
          >
            {#each [...redEntries, ...blueEntries] as entry}
              {@const predictionWeight = winLoseWeight(
                data.matches.find((m) => m.number == entry.match)?.winner,
                entry.prediction,
              )}

              <Button
                onclick={() => {
                  openDialog(ViewEntryDialog, {
                    surveyRecord: data.surveyRecord,
                    fieldRecords: data.fieldRecords,
                    entryRecord: entry,
                  });
                }}
                class="col-span-full grid grid-cols-subgrid gap-x-3 {predictionWeight}"
              >
                <div class="text-{entry.prediction}">{entry.scout}</div>
                <div>{entry.predictionReason}</div>
              </Button>
            {/each}
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <span>No predictions.</span>
  {/if}
</div>
