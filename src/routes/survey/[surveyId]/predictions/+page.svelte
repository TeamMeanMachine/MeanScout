<script lang="ts">
  import type { PageData } from "./$types";
  import Header from "$lib/components/Header.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

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
      return { ...match, entries };
    })
    .filter((match) => match.entries.length);

  function scoutPredictionWeight(redScore: number, blueScore: number, prediction: "red" | "blue" | undefined) {
    if (prediction == "red") {
      if (blueScore > redScore) return "text-sm font-light";
      return "font-bold";
    }

    if (prediction == "blue") {
      if (redScore > blueScore) return "text-sm font-light";
      return "font-bold";
    }

    return "";
  }
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

<div class="flex flex-col gap-2" style="view-transition-name:predictions">
  {#if matches.length}
    <div class="overflow-x-auto">
      <div class="grid gap-x-5 gap-y-3" style="grid-template-columns: repeat(9, min-content);">
        <div class="col-span-full grid grid-cols-subgrid gap-x-3 text-sm">
          <div>Match</div>
          <div class="text-end">Red</div>
          <div class="col-span-6 text-center">Predictions</div>
          <div>Blue</div>
        </div>
        {#each matches as match (match.number)}
          {@const [redScore, blueScore] = [Number(match.redScore), Number(match.blueScore)]}
          <div class="col-span-full grid grid-cols-subgrid gap-x-3">
            <div class="text-end">{match.number}</div>
            <div class="text-end">
              <span class="text-red {redScore > blueScore ? 'font-bold' : 'text-sm font-light'}">{redScore}</span>
            </div>
            <div class="col-span-6 grid grid-cols-subgrid gap-x-3">
              {#each match.entries.filter((entry) => entry.prediction == "red") as entry}
                <div class="text-center">
                  <span class="text-{entry.prediction} {scoutPredictionWeight(redScore, blueScore, entry.prediction)}">
                    {entry.scout}
                  </span>
                </div>
              {/each}
              {#each { length: 6 - match.entries.length }}
                <div></div>
              {/each}
              {#each match.entries.filter((entry) => entry.prediction == "blue") as entry}
                <div class="text-center">
                  <span class="text-{entry.prediction} {scoutPredictionWeight(redScore, blueScore, entry.prediction)}">
                    {entry.scout}
                  </span>
                </div>
              {/each}
            </div>
            <div>
              <span class="text-blue {blueScore > redScore ? 'font-bold' : 'text-sm font-light'}">{blueScore}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
