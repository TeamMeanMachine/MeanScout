<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import { calculateTeamData, colors, getTeamColor, normalizeTeamData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import type { MatchEntry } from "$lib/entry";
  import type { DetailedSingleField } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import { ClipboardCopy, Share2Icon } from "@lucide/svelte";
  import type { EChartsOption } from "echarts";
  import * as echarts from "echarts/core";

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

  const tab = sessionStorageStore<"bar" | "stacked" | "race" | "table">("view-pick-list-tab", "bar");

  const sortedTeamData = getSortedTeamData();

  const text = sortedTeamData
    .map((teamValue, index) => `${index + 1}\t${teamValue.team}\t${teamValue.percentage.toFixed(2)}%`)
    .join("\n");

  let chartParentWidth = $state(0);

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
        percentage: normalizedPickListData[team],
        weights: weightsDataObject(weightsData[team]),
        color: getTeamColor(team),
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

  function generateRaceData(toMatch: number) {
    const subsetEntriesByTeam: Record<string, IDBRecord<MatchEntry>[]> = {};
    const pickListData: Record<string, number> = {};

    for (const team in entriesByTeam) {
      subsetEntriesByTeam[team] = entriesByTeam[team].filter((entry) => entry.match <= toMatch);
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, surveyRecord.expressions, subsetEntriesByTeam, fields);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team] += normalizedTeamData[team];
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);
    const ranks = Object.keys(normalizedPickListData)
      .map((team) => ({ team, percentage: normalizedPickListData[team] }))
      .toSorted((a, b) => b.percentage - a.percentage);

    return ranks.map(({ team, percentage }, i) => ({
      value: [team, i + 1, percentage],
      itemStyle: { color: getTeamColor(team) },
    }));
  }

  function raceChart(div: HTMLElement) {
    let iteration = 1;

    const options = {
      title: {
        text: `Match ${iteration}`,
        textStyle: {
          color: "white",
        },
      },
      tooltip: {
        valueFormatter: (value) => Number(value).toFixed(0) + "%",
      },
      textStyle: {
        fontFamily: "Fira Code VF",
        fontSize: 14,
      },
      xAxis: {
        show: false,
        max: "dataMax",
        position: "top",
        axisLabel: {
          fontFamily: "Fira Code VF",
          fontSize: 14,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: "category",
        axisLabel: {
          interval: 0,
          fontFamily: "Fira Code VF",
          fontSize: 14,
          color: "white",
        },
        inverse: true,
        animationDuration: 500,
        animationDurationUpdate: 500,
      },
      series: {
        realtimeSort: true,
        type: "bar",
        encode: {
          x: 2,
          y: 0,
        },
        data: generateRaceData(1),
        label: {
          show: true,
          formatter(params) {
            return Number((params.value as any[])[2]).toFixed(0) + "%";
          },
          precision: 0,
          position: "right",
          valueAnimation: true,
          color: "white",
        },
        barWidth: 36,
      },
      animationDuration: 0,
      animationDurationUpdate: 1000,
      animationEasing: "linear",
      animationEasingUpdate: "linear",
      grid: {
        top: 10,
        left: 0,
        right: 50,
        bottom: 0,
        containLabel: true,
      },
    } satisfies EChartsOption;

    let timeout: NodeJS.Timeout;
    const chart = echarts.init(div, null, { renderer: "svg" });
    chart.on("finished", () => {
      timeout = setTimeout(update, 0);
    });
    chart.setOption(options);

    function update() {
      options.series.data = generateRaceData(iteration);
      options.title.text = `Match ${iteration}`;
      chart.setOption(options);

      if (iteration >= surveyRecord.matches.length) {
        clearTimeout(timeout);
      } else {
        iteration++;
      }
    }

    $effect(() => {
      if (chartParentWidth > 100) {
        chart.resize({ width: chartParentWidth, height: 40 * sortedTeamData.length });
      }
    });

    return {
      destroy: () => {
        clearTimeout(timeout);
        chart.dispose();
      },
    };
  }
</script>

<span>{pickList.name}</span>

{#if sortedTeamData.length}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "bar")} class={$tab == "bar" ? "font-bold" : "font-light"}>Bar</Button>
    <Button onclick={() => ($tab = "stacked")} class={$tab == "stacked" ? "font-bold" : "font-light"}>Stacked</Button>
    <Button onclick={() => ($tab = "race")} class={$tab == "race" ? "font-bold" : "font-light"}>Race</Button>
    <Button onclick={() => ($tab = "table")} class={$tab == "table" ? "font-bold" : "font-light"}>Table</Button>
  </div>

  <div class="flex max-h-[500px] flex-col gap-4 overflow-y-auto" bind:clientWidth={chartParentWidth}>
    {#if $tab == "bar"}
      {#each sortedTeamData as { team, percentage, color }}
        <div class="pr-1" style="width:{percentage.toFixed(2)}%">
          <div class="flex justify-between gap-3">
            <span>{team}</span>
            {percentage.toFixed(1)}%
          </div>
          <div style="background-color:{color};height:6px"></div>
        </div>
      {/each}
    {:else if $tab == "stacked"}
      <div class="flex flex-col gap-2 text-sm">
        {#each pickList.weights as weight, i}
          {@const color = colors[i % colors.length]}
          <div>
            <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
            {weight.expressionName} ({weight.percentage}%)
          </div>
        {/each}
      </div>
      {#each sortedTeamData as { team, percentage, weights }}
        <div class="pr-1" style="width:{percentage.toFixed(2)}%">
          <div class="flex justify-between gap-3">
            <span>{team}</span>
            {percentage.toFixed(1)}%
          </div>
          <div class="flex gap-1 bg-neutral-800">
            {#each pickList.weights as weight, i}
              {@const color = colors[i % colors.length]}
              {@const divWidth = weights[weight.expressionName] * percentage}
              {#if divWidth}
                <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                  <div style="background-color:{color};height:6px"></div>
                  <div class="bg-neutral-900 text-center text-sm font-light">
                    {((weights[weight.expressionName] / weight.percentage) * 100).toFixed(0)}%
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    {:else if $tab == "race"}
      <div use:raceChart style="height: {40 * sortedTeamData.length}px"></div>
    {:else if $tab == "table"}
      <table class="w-full text-right">
        <thead>
          <tr>
            <th class="p-2">Rank</th>
            <th class="p-2">Team</th>
            <th class="p-2">Percent</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedTeamData as teamValue, i}
            <tr>
              <td class="p-2">{i + 1}</td>
              <td class="p-2">{teamValue.team}</td>
              <td class="p-2">{teamValue.percentage.toFixed(2)}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
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
