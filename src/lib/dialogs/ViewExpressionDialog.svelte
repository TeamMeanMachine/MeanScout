<script lang="ts">
  import { calculateTeamData } from "$lib/analysis";
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

  function getSortedTeamData() {
    const teamData = calculateTeamData(expression.name, surveyRecord.expressions, entriesByTeam, fields);

    return Object.keys(teamData)
      .map((team) => ({
        team,
        teamName: surveyRecord.teams.find((t) => t.number == team)?.name || "",
        value: teamData[team],
      }))
      .toSorted((a, b) => b.value - a.value);
  }

  const sortedTeamData = getSortedTeamData();

  const text = sortedTeamData
    .map((teamValue, index) => `${index + 1}\t${teamValue.team}\t${teamValue.value.toFixed(2)}`)
    .join("\n");
</script>

<div class="flex flex-wrap items-end justify-between gap-x-2">
  <strong>{expression.name}</strong>
  {#if expression.scope == "entry"}
    <small>(Average)</small>
  {/if}
</div>

{#if sortedTeamData.length}
  {@const maxValue = Math.max(...sortedTeamData.map(({ value }) => value))}
  {@const minValue = Math.min(...sortedTeamData.map(({ value }) => value))}

  <div class="flex max-h-[500px] flex-col gap-4 overflow-y-auto">
    <div class="grid gap-x-1 gap-y-4 pr-1" style="grid-template-columns:min-content auto">
      {#each sortedTeamData as { team, teamName, value }, i}
        {@const percentage = Math.abs(((value - Math.min(minValue, 0)) / (maxValue || minValue || value || 1)) * 100)}
        {@const color = `rgb(var(--theme-color) / ${percentage.toFixed(2)}%)`}

        <div class="flex flex-col justify-center pr-2 text-center text-sm font-bold">{i + 1}</div>
        <div>
          <div class="flex items-end justify-between gap-3">
            <div class="flex flex-col">
              <strong>{team}</strong>
              {#if teamName}
                <small class="font-light">{teamName}</small>
              {/if}
            </div>
            {value.toFixed(2)}
          </div>
          <div class="bg-neutral-800">
            <div style="background-color:{color};width:{percentage.toFixed(2)}%;height:6px"></div>
          </div>
        </div>
      {/each}
    </div>
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
