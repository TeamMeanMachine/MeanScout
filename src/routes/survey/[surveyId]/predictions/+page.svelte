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

  function coopPointMultiplier(cooperators: number) {
    return 1 + cooperators * 0.2;
  }

  function winLoseWeight(winner: "red" | "blue" | undefined, matching: "red" | "blue" | undefined) {
    return winner && winner == matching ? "font-bold" : "text-sm font-light";
  }

  const allScoutNames = [
    ...new Set([
      ...data.entryRecords.map((entry) => entry.scout).filter((scout) => scout !== undefined),
      ...(data.surveyRecord.scouts || []),
    ]),
  ];

  const scouts = allScoutNames
    .map((scout) => {
      const entries = data.entryRecords.filter(
        (entry) => entry.status != "draft" && entry.scout == scout && entry.prediction,
      );
      let correctGuesses = 0;
      let points = 0;

      for (const entry of entries) {
        const match = data.surveyRecord.matches.find((m) => m.number == entry.match);
        if (!match || !match.redScore || !match.blueScore) {
          continue;
        }

        if (match.redScore > match.blueScore && entry.prediction == "red") {
          const otherCorrectEntriesCount = data.entryRecords.filter(
            (e) => e.scout != scout && e.match == match.number && e.prediction == "red",
          ).length;
          points += coopPointMultiplier(otherCorrectEntriesCount);
          correctGuesses++;
        }

        if (match.blueScore > match.redScore && entry.prediction == "blue") {
          const otherCorrectEntriesCount = data.entryRecords.filter(
            (e) => e.scout != scout && e.match == match.number && e.prediction == "blue",
          ).length;
          points += coopPointMultiplier(otherCorrectEntriesCount);
          correctGuesses++;
        }
      }

      return {
        scout,
        points,
        correctGuesses,
      };
    })
    .toSorted((a, b) => b.points - a.points);

  const matches = data.surveyRecord.matches
    .filter((match) => match.redScore !== undefined && match.blueScore !== undefined)
    .toSorted((a, b) => b.number - a.number)
    .map((match) => {
      const entries = data.entryRecords
        .filter((entry) => entry.status != "draft" && entry.match == match.number && entry.scout && entry.prediction)
        /*
        .map((entry) => {
          if (!entry.scout && !entry.prediction) {
            entry.scout = "Scout";
            entry.prediction = Math.random() > 0.5 ? "blue" : "red";
          }
          return entry;
        })
        //*/
        .toSorted((a, b) => a.scout?.localeCompare(b.scout || "") || 0);

      const redEntries = entries.filter((entry) => entry.prediction == "red");
      const blueEntries = entries.filter((entry) => entry.prediction == "blue");
      const predictedEntryCount = redEntries.length + blueEntries.length;

      const redScore = Number(match.redScore);
      const blueScore = Number(match.blueScore);
      const winner: "red" | "blue" | undefined =
        redScore > blueScore ? "red" : blueScore > redScore ? "blue" : undefined;

      return { ...match, redScore, blueScore, winner, redEntries, blueEntries, predictedEntryCount };
    })
    .filter((match) => match.predictedEntryCount);
</script>

<svelte:window {onscroll} />

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
    {#if scouts?.length}
      <div class="overflow-x-auto">
        <div class="grid gap-x-4 gap-y-3" style="grid-template-columns: repeat(3, min-content);">
          <div class="col-span-full grid grid-cols-subgrid text-sm">
            <div>Scout</div>
            <div>Points</div>
            <div>Correct Guesses</div>
          </div>
          {#each scouts as { scout, points, correctGuesses }}
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
    {#if matches.length}
      <div class="overflow-x-auto">
        <div class="grid gap-x-4 gap-y-3" style="grid-template-columns: repeat(9, min-content);">
          <div class="col-span-full grid grid-cols-subgrid text-center text-sm">
            <div>#</div>
            <div>Red</div>
            <div class="col-span-6">Predictions</div>
            <div>Blue</div>
          </div>
          {#each matches as { number, redScore, blueScore, winner, redEntries, blueEntries, predictedEntryCount }}
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
