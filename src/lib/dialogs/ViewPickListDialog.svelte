<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { MatchEntry } from "$lib/entry";
  import type { DetailedSingleField } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import * as echarts from "echarts";

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

  let tab = $state<"chart" | "table">("chart");

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
        ...weightsDataObject(weightsData[team]),
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

  const sortedTeamData = getSortedTeamData();

  const text = sortedTeamData
    .map((teamValue, index) => `${index + 1}\t${teamValue.team}\t${teamValue.percentage.toFixed(2)}%`)
    .join("\n");

  let chartParentWidth = $state(0);

  function initChart(div: HTMLElement) {
    const revSortedTeamData = sortedTeamData.toReversed();

    const chart = echarts.init(div, null, { renderer: "svg" });

    const options: echarts.EChartsOption = {
      tooltip: {
        valueFormatter: (value) => Number(value).toFixed(2) + "%",
      },
      legend: {
        textStyle: {
          color: "white",
        },
        orient: "vertical",
        left: 0,
      },
      textStyle: {
        fontFamily: "Fira Code VF",
        fontSize: 14,
      },
      xAxis: {
        show: false,
        position: "top",
        type: "value",
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
      },
      dataset: {
        dimensions: ["team", ...pickList.weights.map((weight) => weight.expressionName)],
        source: revSortedTeamData,
      },
      series: pickList.weights.map((weight): echarts.SeriesOption => {
        return {
          type: "bar",
          stack: "total",
          label: {
            show: true,
            formatter: ({ value }) => (value as Record<string, number>)[weight.expressionName].toFixed(0) + "%",
          },
          emphasis: {
            focus: "series",
          },
          barWidth: 36,
        };
      }),
      grid: {
        left: 0,
        right: 25,
        bottom: 0,
        containLabel: true,
      },
    };

    chart.setOption(options);

    $effect(() => {
      if (chartParentWidth > 100) {
        chart.resize({ width: chartParentWidth, height: 40 * revSortedTeamData.length });
      }
    });
  }
</script>

<span>{pickList.name}</span>

{#if sortedTeamData.length}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => (tab = "chart")} class={tab == "chart" ? "font-bold" : "font-light"}>Chart</Button>
    <Button onclick={() => (tab = "table")} class={tab == "table" ? "font-bold" : "font-light"}>Table</Button>
  </div>

  <div class="flex max-h-[500px] flex-col gap-2 overflow-y-auto" bind:clientWidth={chartParentWidth}>
    {#if tab == "chart"}
      <div use:initChart style="height: {40 * sortedTeamData.length}px"></div>
    {:else}
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
        <Icon name="share" />
        Share
      </Button>
    {/if}

    {#if "clipboard" in navigator}
      <Button onclick={() => navigator.clipboard.writeText(text)} class="grow basis-0">
        <Icon name="copy" />
        Copy
      </Button>
    {/if}
  </div>
{/if}
