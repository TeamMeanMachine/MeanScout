<script lang="ts">
  import type { PageData } from "./$types";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let tab = $state<"scouts" | "matches">("scouts");

  function winLoseWeight(winner: "red" | "blue" | undefined, matching: "red" | "blue" | undefined) {
    return winner && winner == matching ? "font-bold" : "text-sm font-light";
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
    <Button onclick={() => (tab = "scouts")} class={tab == "scouts" ? "font-bold" : "font-light"}>Scouts</Button>
    <Button onclick={() => (tab = "matches")} class={tab == "matches" ? "font-bold" : "font-light"}>Matches</Button>
  </div>

  {#if tab == "scouts"}
    {#if data.scouts?.length}
      <div class="overflow-x-auto">
        <div class="grid gap-x-4 gap-y-3" style="grid-template-columns: repeat(3, min-content);">
          <div class="col-span-full grid grid-cols-subgrid text-sm">
            <div>Scout</div>
            <div>Points</div>
            <div>Correct Guesses</div>
          </div>
          {#each data.scouts as { scout, points, correctGuesses }}
            <div class="col-span-full grid grid-cols-subgrid">
              <div>{scout}</div>
              <div class="text-center">{points.toFixed(1)}</div>
              <div class="text-center">{correctGuesses}</div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <span>No scouts.</span>
    {/if}
  {:else if tab == "matches"}
    {#if data.matches.length}
      <div class="overflow-x-auto">
        <div class="grid gap-x-4 gap-y-3" style="grid-template-columns: repeat(9, min-content);">
          <div class="col-span-full grid grid-cols-subgrid text-center text-sm">
            <div>#</div>
            <div>Red</div>
            <div class="col-span-6">Predictions</div>
            <div>Blue</div>
          </div>
          {#each data.matches as { number, redScore, blueScore, winner, redEntries, blueEntries, predictedEntryCount }}
            <div class="col-span-full grid grid-cols-subgrid">
              <div class="text-center">{number}</div>
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
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <span>No matches.</span>
    {/if}
  {/if}
</div>
