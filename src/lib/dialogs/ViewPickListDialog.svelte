<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import { calculateTeamData, colors, normalizeTeamData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import RaceChart from "$lib/components/RaceChart.svelte";
  import type { MatchEntry } from "$lib/entry";
  import type { DetailedSingleField } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import { ClipboardCopy, Share2Icon } from "@lucide/svelte";

  let {
    surveyRecord,
    fields,
    entriesByTeam,
    pickList,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fields: DetailedSingleField[];
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    pickList: PickList;
  } = $props();

  const sortedWeights = pickList.weights.toSorted((a, b) => b.percentage - a.percentage);

  const tab = sessionStorageStore<"bar" | "race" | "stacked">("view-pick-list-tab", "bar");
  const showWeights = sessionStorageStore<"" | "true">("stacked-chart-show-weights", "");

  const sortedTeamData = getSortedTeamData();

  const text = sortedTeamData
    .map((teamValue, index) => `${index + 1}\t${teamValue.team}\t${teamValue.percentage.toFixed(2)}%`)
    .join("\n");

  let overflowDiv = $state<HTMLDivElement>();

  $effect(() => {
    $tab;
    overflowDiv?.scrollTo({ top: 0 });
  });

  function getSortedTeamData() {
    const pickListData: Record<string, number> = {};
    const weightsData: Record<string, number[]> = {};

    for (const team in entriesByTeam) {
      pickListData[team] = 0;
      weightsData[team] = [];
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, surveyRecord.expressions, entriesByTeam, fields);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team] += normalizedTeamData[team];
        weightsData[team].push(normalizedTeamData[team]);
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);

    return Object.keys(normalizedPickListData)
      .map((team) => ({
        team,
        teamName: surveyRecord.teams.find((t) => t.number == team)?.name || "",
        percentage: normalizedPickListData[team],
        weights: weightsDataObject(weightsData[team]),
      }))
      .toSorted((a, b) => b.percentage - a.percentage);
  }

  function weightsDataObject(weights: number[]) {
    let obj: Record<string, number> = {};
    for (let i = 0; i < weights.length; i++) {
      obj[pickList.weights[i].expressionName] = weights[i];
    }
    return obj;
  }
</script>

<strong>{pickList.name}</strong>

{#if sortedTeamData.length}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "bar")} class={$tab == "bar" ? "font-bold" : "font-light"}>Bar</Button>
    <Button onclick={() => ($tab = "race")} class={$tab == "race" ? "font-bold" : "font-light"}>Race</Button>
    <Button onclick={() => ($tab = "stacked")} class={$tab == "stacked" ? "font-bold" : "font-light"}>Stacked</Button>
  </div>

  {#if $tab == "stacked"}
    <Button onclick={() => ($showWeights = $showWeights ? "" : "true")} class="gap-x-4 text-sm">
      {#if $showWeights}
        {#each sortedWeights as weight, i}
          {@const color = colors[i % colors.length]}
          <div>
            <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
            {weight.expressionName} ({weight.percentage}%)
          </div>
        {/each}
      {:else}
        Show weights
      {/if}
    </Button>
  {/if}

  <div bind:this={overflowDiv} class="-mx-1 flex max-h-[500px] flex-col gap-4 overflow-y-auto px-1">
    {#if $tab == "bar"}
      <div class="grid gap-x-1 gap-y-4 pr-1" style="grid-template-columns:min-content auto">
        {#each sortedTeamData as { team, teamName, percentage }, i}
          {@const color = `rgb(var(--theme-color) / ${percentage.toFixed(2)}%)`}

          <div class="flex flex-col justify-center pr-2 text-center text-sm font-bold">{i + 1}</div>
          <div class="pr-1">
            <div class="flex items-end justify-between gap-3">
              <div class="flex flex-col">
                <strong>{team}</strong>
                {#if teamName}
                  <small class="font-light">{teamName}</small>
                {/if}
              </div>
              {percentage.toFixed(1)}%
            </div>
            <div class="bg-neutral-800">
              <div style="background-color:{color};width:{percentage.toFixed(2)}%;height:6px"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if $tab == "race"}
      <RaceChart {surveyRecord} {fields} {entriesByTeam} {pickList} />
    {:else if $tab == "stacked"}
      <div class="grid gap-x-1 gap-y-4 pr-1" style="grid-template-columns:min-content auto">
        {#each sortedTeamData as { team, teamName, percentage, weights }, i}
          <div class="flex flex-col justify-center pr-2 text-center text-sm font-bold">{i + 1}</div>

          <div class="pr-1">
            <div class="flex items-end justify-between gap-3">
              <div class="flex flex-col">
                <strong>{team}</strong>
                {#if teamName}
                  <small class="font-light">{teamName}</small>
                {/if}
              </div>
              {percentage.toFixed(1)}%
            </div>
            <div class="bg-neutral-800">
              <div class="flex gap-1" style="width:{percentage.toFixed(2)}%">
                {#each sortedWeights as weight, i}
                  {@const color = colors[i % colors.length]}
                  {@const opacity = ((weights[weight.expressionName] / weight.percentage) * 100).toFixed(2)}
                  {@const divWidth = weights[weight.expressionName] * percentage}
                  {#if divWidth}
                    <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                      <div style="background-color:{color};height:6px;opacity:{opacity}%"></div>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
            <div class="flex gap-1" style="width:{percentage.toFixed(2)}%">
              {#each sortedWeights as weight}
                {@const divWidth = weights[weight.expressionName] * percentage}
                {#if divWidth}
                  <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                    <div class="text-center text-sm font-light">
                      {((weights[weight.expressionName] / weight.percentage) * 100).toFixed(0)}%
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="flex gap-3">
    {#if "canShare" in navigator}
      <Button onclick={() => navigator.share({ text })} class="grow basis-0">
        <Share2Icon class="text-theme" />
        Share
      </Button>
    {/if}

    {#if "clipboard" in navigator}
      <Button onclick={() => navigator.clipboard.writeText(text)} class="grow basis-0">
        <ClipboardCopy class="text-theme" />
        Copy
      </Button>
    {/if}
  </div>
{/if}
