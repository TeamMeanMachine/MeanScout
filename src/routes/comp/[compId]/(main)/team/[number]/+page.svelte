<script lang="ts">
  import type { PageProps } from "./$types";
  import Button from "$lib/components/Button.svelte";
  import { SquareArrowOutUpRightIcon } from "@lucide/svelte";
  import { sessionStorageStore } from "$lib";
  import TeamMatchDataTable from "$lib/components/TeamMatchDataTable.svelte";
  import TeamPitDataTable from "$lib/components/TeamPitDataTable.svelte";
  import TimeChart from "$lib/components/TimeChart.svelte";

  let { data }: PageProps = $props();

  const showData = sessionStorageStore<"expressions" | "raw">("entry-view-show-data", "expressions");
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <div class="flex flex-col">
      <h2 class="font-bold">Team {data.team.number}</h2>
      {#if data.team.name}
        <span class="text-xs font-light">{data.team.name}</span>
      {/if}
    </div>
  </div>

  <TimeChart pageData={data} team={data.team} />

  {#each data.surveyRecords
    .filter((survey) => survey.type == "match")
    .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <div class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center justify-between">
        <h2 class="text-sm">{surveyRecord.name}</h2>

        <div class="flex flex-wrap gap-2 text-sm">
          <Button
            onclick={() => {
              $showData = "expressions";
            }}
            class={$showData == "expressions" ? "font-bold" : "font-light"}
          >
            Derived
          </Button>
          <Button
            onclick={() => {
              $showData = "raw";
            }}
            class={$showData == "raw" ? "font-bold" : "font-light"}
          >
            Raw
          </Button>
        </div>
      </div>

      <div class="w-full overflow-x-auto">
        {#key data.team}
          <TeamMatchDataTable pageData={data} {surveyRecord} team={data.team} show={$showData} />
        {/key}
      </div>
    </div>
  {/each}

  {#each data.surveyRecords
    .filter((s) => s.type == "pit")
    .toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <div class="flex flex-col items-start gap-1 overflow-x-auto">
      <h2 class="sticky left-0 text-sm">{surveyRecord.name}</h2>

      {#key data.team}
        <TeamPitDataTable pageData={data} {surveyRecord} team={data.team} />
      {/key}
    </div>
  {/each}

  <div class="flex flex-wrap gap-x-4">
    {#if data.compRecord.tbaEventKey}
      <a
        href="https://www.thebluealliance.com/team/{parseInt(data.team.number)}/{parseInt(
          data.compRecord.tbaEventKey,
        )}#{data.compRecord.tbaEventKey}"
        target="_blank"
      >
        <span class="underline">TBA</span>
        <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
      </a>
    {:else}
      <a href="https://www.thebluealliance.com/team/{parseInt(data.team.number)}" target="_blank">
        <span class="underline">TBA</span>
        <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
      </a>
    {/if}

    <a href="https://www.statbotics.io/team/{parseInt(data.team.number)}" target="_blank">
      <span class="underline">Statbotics</span>
      <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
    </a>
  </div>
</div>
