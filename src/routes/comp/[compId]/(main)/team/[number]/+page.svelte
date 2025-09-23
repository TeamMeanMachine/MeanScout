<script lang="ts">
  import type { PageProps } from "./$types";
  import TeamDerivedDataTable from "$lib/components/TeamDerivedDataTable.svelte";
  import TeamRawDataTable from "$lib/components/TeamRawDataTable.svelte";
  import Button from "$lib/components/Button.svelte";
  import { SquareArrowOutUpRightIcon } from "@lucide/svelte";
  import { sessionStorageStore } from "$lib";

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

    {#if data.hasExpressions}
      <div class="flex gap-2 text-sm">
        <Button
          onclick={() => ($showData = "expressions")}
          class={$showData == "expressions" ? "font-bold" : "font-light"}
        >
          Derived
        </Button>
        <Button onclick={() => ($showData = "raw")} class={$showData == "raw" ? "font-bold" : "font-light"}>Raw</Button>
      </div>
    {/if}
  </div>

  {#each data.surveyRecords.toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <div class="flex flex-col gap-1 overflow-x-auto">
      <h2 class="sticky left-0 font-bold">{surveyRecord.name}</h2>

      {#if $showData == "expressions" && surveyRecord.type == "match"}
        <TeamDerivedDataTable pageData={data} {surveyRecord} team={data.team} />
      {:else}
        <TeamRawDataTable pageData={data} {surveyRecord} team={data.team} />
      {/if}
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
