<script lang="ts">
  import type { PageProps } from "./$types";
  import Button from "$lib/components/Button.svelte";
  import { ArrowLeftIcon, ArrowRightIcon, SquareArrowOutUpRightIcon } from "@lucide/svelte";
  import { sessionStorageStore } from "$lib";
  import TeamMatchDataTable from "$lib/components/TeamMatchDataTable.svelte";
  import TeamPitDataTable from "$lib/components/TeamPitDataTable.svelte";
  import Anchor from "$lib/components/Anchor.svelte";

  let { data }: PageProps = $props();

  const showData = sessionStorageStore<"expressions" | "raw">("entry-view-show-data", "expressions");

  const nextTeam = $derived.by(() => {
    return data.teams.find((t) => data.team.number.localeCompare(t.number, "en", { numeric: true }) == -1);
  });
  const previousTeam = $derived.by(() => {
    return data.teams.findLast((t) => data.team.number.localeCompare(t.number, "en", { numeric: true }) == 1);
  });
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <div class="flex flex-col">
      <h2 class="font-bold">Team {data.team.number}</h2>
      {#if data.team.name}
        <span class="text-xs font-light">{data.team.name}</span>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div class="flex gap-2" data-sveltekit-replacestate>
        {#if previousTeam}
          <Anchor
            route="comp/{data.compRecord.id}/team/{previousTeam.number}"
            class="active:-translate-x-0.5! active:translate-y-0!"
          >
            <ArrowLeftIcon class="text-theme size-5" />
          </Anchor>
        {:else}
          <Button disabled>
            <ArrowLeftIcon class="text-theme size-5" />
          </Button>
        {/if}

        {#if nextTeam}
          <Anchor route="comp/{data.compRecord.id}/team/{nextTeam.number}">
            <ArrowRightIcon class="text-theme size-5" />
          </Anchor>
        {:else}
          <Button disabled>
            <ArrowRightIcon class="text-theme size-5" />
          </Button>
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
          <Button onclick={() => ($showData = "raw")} class={$showData == "raw" ? "font-bold" : "font-light"}>
            Raw
          </Button>
        </div>
      {/if}
    </div>
  </div>

  {#each data.surveyRecords.toSorted((a, b) => a.name.localeCompare(b.name)) as surveyRecord}
    <div class="flex flex-col gap-1 overflow-x-auto">
      <h2 class="sticky left-0 text-sm">{surveyRecord.name}</h2>

      {#key data.team}
        {#if surveyRecord.type == "match"}
          <TeamMatchDataTable pageData={data} {surveyRecord} team={data.team} show={$showData} />
        {:else}
          <TeamPitDataTable pageData={data} {surveyRecord} team={data.team} />
        {/if}
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
