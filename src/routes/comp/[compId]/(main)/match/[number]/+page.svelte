<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { ArrowLeftIcon, ArrowRightIcon, SquareArrowOutUpRightIcon } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import MatchDataTable from "$lib/components/MatchDataTable.svelte";
  import MatchRanksChart from "$lib/components/MatchRanksChart.svelte";
  import Anchor from "$lib/components/Anchor.svelte";

  let { data }: PageProps = $props();

  const showRanks = $derived(data.fieldRecords.length && data.entryRecords.length);

  const showData = sessionStorageStore<"expressions" | "raw">("entry-view-show-data", "expressions");
  const showWhich = sessionStorageStore<"info" | "ranks" | "data">("match-view-show-which", "info");

  const nextMatch = $derived.by(() => {
    return data.matches.find((match) => match.number == data.match!.number + 1);
  });
  const previousMatch = $derived.by(() => {
    return data.matches.find((match) => match.number == data.match!.number - 1);
  });

  const redWon = $derived(
    data.match?.redScore !== undefined &&
      data.match.blueScore !== undefined &&
      data.match.redScore > data.match.blueScore,
  );
  const blueWon = $derived(
    data.match?.redScore !== undefined &&
      data.match.blueScore !== undefined &&
      data.match.redScore < data.match.blueScore,
  );

  function teamWonFontWeight(team: string) {
    if (data.match.redScore !== undefined && data.match.blueScore !== undefined) {
      if (redWon && [data.match.red1, data.match.red2, data.match.red3].includes(team)) {
        return "font-bold";
      }

      if (blueWon && [data.match.blue1, data.match.blue2, data.match.blue3].includes(team)) {
        return "font-bold";
      }

      return "font-light";
    }

    return "";
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <div class="flex flex-col">
      <h2 class="font-bold">Match {data.match.number}</h2>
      {#if data.match.redScore !== undefined && data.match.blueScore !== undefined}
        <div class="text-xs">
          {#if redWon}
            <span class="text-red font-bold">Red</span>
            won:
          {:else if blueWon}
            <span class="text-blue font-bold">Blue</span>
            won:
          {:else}
            <span class="font-bold">Tied:</span>
          {/if}
          <span class="text-red {redWon ? 'font-bold' : 'font-light'}">{data.match.redScore}</span>
          <span>to</span>
          <span class="text-blue {blueWon ? 'font-bold' : 'font-light'}">{data.match.blueScore}</span>
        </div>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div class="flex gap-2">
        {#if previousMatch}
          <Anchor
            route="comp/{data.compRecord.id}/match/{previousMatch.number}"
            class="active:-translate-x-0.5! active:translate-y-0!"
          >
            <ArrowLeftIcon class="text-theme size-5" />
          </Anchor>
        {:else}
          <Button disabled>
            <ArrowLeftIcon class="text-theme size-5" />
          </Button>
        {/if}

        {#if nextMatch}
          <Anchor
            route="comp/{data.compRecord.id}/match/{nextMatch.number}"
            class="active:translate-x-0.5! active:translate-y-0!"
          >
            <ArrowRightIcon class="text-theme size-5" />
          </Anchor>
        {:else}
          <Button disabled>
            <ArrowRightIcon class="text-theme size-5" />
          </Button>
        {/if}
      </div>

      <div class="flex flex-wrap gap-2 text-sm">
        <Button onclick={() => ($showWhich = "info")} class={$showWhich == "info" ? "font-bold" : "font-light"}>
          Info
        </Button>
        {#if showRanks}
          <Button onclick={() => ($showWhich = "ranks")} class={$showWhich == "ranks" ? "font-bold" : "font-light"}>
            Ranks
          </Button>
        {/if}
        {#if data.hasExpressions}
          <Button
            onclick={() => {
              $showData = "expressions";
              $showWhich = "data";
            }}
            class={$showData == "expressions" && $showWhich == "data" ? "font-bold" : "font-light"}
          >
            Derived
          </Button>
        {/if}
        <Button
          onclick={() => {
            $showData = "raw";
            $showWhich = "data";
          }}
          class={$showData == "raw" && $showWhich == "data" ? "font-bold" : "font-light"}
        >
          Raw
        </Button>
      </div>
    </div>
  </div>

  {#if $showWhich == "ranks" && showRanks}
    <MatchRanksChart pageData={data} match={data.match} />
  {:else if $showWhich == "data"}
    {#each data.surveyRecords
      .filter((survey) => survey.type == "match")
      .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
      <div class="flex flex-col gap-1 overflow-x-auto">
        <h2 class="sticky left-0 text-sm">{surveyRecord.name}</h2>

        {#key data.match}
          <MatchDataTable pageData={data} {surveyRecord} match={data.match} show={$showData} />
        {/key}
      </div>
    {/each}
  {:else}
    <div class="flex flex-col gap-2 sm:grid sm:grid-cols-2">
      {#each [data.match.red1, data.match.red2, data.match.red3] as team, index}
        {@const order = ["sm:order-1", "sm:order-3", "sm:order-5"]}
        {@const teamName = data.compRecord.teams.find((t) => t.number == team)?.name}

        <Anchor route="comp/{data.compRecord.id}/team/{team}" class={order[index]}>
          <div class="flex flex-col truncate {teamWonFontWeight(team)}">
            <span class="text-red">{team}</span>
            {#if teamName}
              <span class="truncate text-xs">{teamName}</span>
            {/if}
          </div>
        </Anchor>
      {/each}

      {#each [data.match.blue1, data.match.blue2, data.match.blue3] as team, index}
        {@const order = ["sm:order-2", "sm:order-4", "sm:order-6"]}
        {@const teamName = data.compRecord.teams.find((t) => t.number == team)?.name}

        <Anchor route="comp/{data.compRecord.id}/team/{team}" class={order[index]}>
          <div class="flex flex-col truncate {teamWonFontWeight(team)}">
            <span class="text-blue">{team}</span>
            {#if teamName}
              <span class="truncate text-xs">{teamName}</span>
            {/if}
          </div>
        </Anchor>
      {/each}
    </div>
  {/if}

  {#if data.compRecord.tbaEventKey}
    <div class="flex flex-wrap gap-x-4">
      <a
        href="https://www.thebluealliance.com/match/{data.compRecord.tbaEventKey}_qm{data.match.number}"
        target="_blank"
      >
        <span class="underline">TBA</span>
        <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
      </a>

      <a href="https://www.statbotics.io/match/{data.compRecord.tbaEventKey}_qm{data.match.number}" target="_blank">
        <span class="underline">Statbotics</span>
        <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
      </a>
    </div>
  {/if}
</div>
