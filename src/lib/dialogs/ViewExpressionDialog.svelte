<script lang="ts">
  import { calculateTeamData, normalizeTeamData } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { MatchEntry } from "$lib/entry";
  import type { Expression } from "$lib/expression";
  import type { DetailedSingleField } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import * as echarts from "echarts";

  let {
    surveyRecord,
    fields,
    entriesByTeam,
    expression,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fields: DetailedSingleField[];
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    expression: Expression;
  } = $props();

  let tab = $state<"bar" | "table">("bar");

  let chartParentWidth = $state(0);

  const colors = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc"];
  function getTeamColor(team: string) {
    return colors[Object.keys(entriesByTeam).findIndex((t) => team == t) % colors.length];
  }

  function getSortedTeamData() {
    const teamData = calculateTeamData(expression.name, surveyRecord.expressions, entriesByTeam, fields);
    const normalizedTeamData = normalizeTeamData(teamData);

    return Object.keys(normalizedTeamData)
      .map((team) => ({ team, value: teamData[team], color: getTeamColor(team) }))
      .toSorted((a, b) => b.value - a.value);
  }

  const sortedTeamData = getSortedTeamData();

  const text = sortedTeamData
    .map((teamValue, index) => `${index + 1}\t${teamValue.team}\t${teamValue.value.toFixed(2)}%`)
    .join("\n");

  function barChart(div: HTMLElement) {
    const barData = sortedTeamData.map(({ team, value, color }) => ({
      value: [team, value],
      itemStyle: { color },
    }));

    const options = {
      tooltip: {
        valueFormatter: (value) => Number(value).toFixed(2),
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
        max: "dataMax",
        position: "bottom",
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
        inverse: true,
      },
      series: {
        type: "bar",
        data: barData,
        encode: {
          x: 1,
          y: 0,
        },
        label: {
          show: true,
          formatter: ({ value }) => (value as number[])[1].toFixed(2),
          position: "right",
          color: "white",
        },
        barWidth: 36,
      },
      grid: {
        top: 0,
        left: 0,
        right: 50,
        bottom: 0,
        containLabel: true,
      },
    } satisfies echarts.EChartsOption;

    const chart = echarts.init(div, null, { renderer: "svg" });
    chart.setOption(options);

    $effect(() => {
      if (chartParentWidth > 100) {
        chart.resize({ width: chartParentWidth, height: 40 * sortedTeamData.length });
      }
    });

    return { destroy: () => chart.dispose() };
  }
</script>

<div class="flex flex-col">
  <span>{expression.name}</span>
  {#if expression.scope == "entry"}
    <small>(Showing average across entries)</small>
  {/if}
</div>

{#if sortedTeamData.length}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => (tab = "bar")} class={tab == "bar" ? "font-bold" : "font-light"}>Bar</Button>
    <Button onclick={() => (tab = "table")} class={tab == "table" ? "font-bold" : "font-light"}>Table</Button>
  </div>

  <div class="flex max-h-[500px] flex-col gap-2 overflow-y-auto" bind:clientWidth={chartParentWidth}>
    {#if tab == "bar"}
      <div use:barChart style="height: {40 * sortedTeamData.length}px"></div>
    {:else if tab == "table"}
      <table class="w-full text-right">
        <thead>
          <tr>
            <th class="p-2">Rank</th>
            <th class="p-2">Team</th>
            <th class="p-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedTeamData as teamValue, i}
            <tr>
              <td class="p-2">{i + 1}</td>
              <td class="p-2">{teamValue.team}</td>
              <td class="p-2">{teamValue.value.toFixed(2)}</td>
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
