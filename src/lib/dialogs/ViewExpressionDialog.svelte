<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import { calculateTeamData, getTeamColor } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import type { MatchEntry } from "$lib/entry";
  import type { Expression } from "$lib/expression";
  import type { DetailedSingleField } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import { ClipboardCopyIcon, Share2Icon } from "@lucide/svelte";

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

  const tab = sessionStorageStore<"bar" | "table">("view-expression-tab", "bar");

  function getSortedTeamData() {
    const teamData = calculateTeamData(expression.name, surveyRecord.expressions, entriesByTeam, fields);

    return Object.keys(teamData)
      .map((team) => ({ team, value: teamData[team], color: getTeamColor(team) }))
      .toSorted((a, b) => b.value - a.value);
  }

  const sortedTeamData = getSortedTeamData();

  const text = sortedTeamData
    .map((teamValue, index) => `${index + 1}\t${teamValue.team}\t${teamValue.value.toFixed(2)}%`)
    .join("\n");
</script>

<div class="flex flex-col">
  <span>{expression.name}</span>
  {#if expression.scope == "entry"}
    <small>(Showing average across entries)</small>
  {/if}
</div>

{#if sortedTeamData.length}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "bar")} class={$tab == "bar" ? "font-bold" : "font-light"}>Bar</Button>
    <Button onclick={() => ($tab = "table")} class={$tab == "table" ? "font-bold" : "font-light"}>Table</Button>
  </div>

  <div class="flex max-h-[500px] flex-col gap-4 overflow-y-auto">
    {#if $tab == "bar"}
      {@const maxValue = Math.max(...sortedTeamData.map(({ value }) => value))}
      {@const minValue = Math.min(...sortedTeamData.map(({ value }) => value))}
      {#each sortedTeamData as { team, value, color }}
        {@const divWidth = Math.abs(((value - Math.min(minValue, 0)) / (maxValue || minValue || value || 1)) * 100)}
        <div class="pr-1" style="width:{divWidth.toFixed(2)}%">
          <div class="flex justify-between gap-3">
            <span>{team}</span>
            {value.toFixed(2)}
          </div>
          <div style="background-color:{color};height:6px"></div>
        </div>
      {/each}
    {:else if $tab == "table"}
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
        <Share2Icon class="text-theme" />
        Share
      </Button>
    {/if}

    {#if "clipboard" in navigator}
      <Button onclick={() => navigator.clipboard.writeText(text)} class="grow basis-0">
        <ClipboardCopyIcon class="text-theme" />
        Copy
      </Button>
    {/if}
  </div>
{/if}
