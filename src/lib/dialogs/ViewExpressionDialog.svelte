<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type Expression } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { MatchEntry } from "$lib/entry";
  import type { DetailedSingleField } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";

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
    const normalizedTeamData = normalizeTeamData(teamData);

    return Object.keys(normalizedTeamData)
      .map((team) => ({ team, percentage: normalizedTeamData[team], value: teamData[team] }))
      .toSorted((a, b) => b.value - a.value);
  }

  const sortedTeamData = getSortedTeamData();

  const text = sortedTeamData
    .map(
      (teamValue, index) =>
        `${index + 1}\t${teamValue.team}\t${teamValue.value.toFixed(2)}\t${teamValue.percentage.toFixed(2)}%`,
    )
    .join("\n");
</script>

<span>{expression.name}</span>

{#if sortedTeamData.length}
  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
    <table class="w-full text-right">
      <thead>
        <tr>
          <th class="p-2">Rank</th>
          <th class="p-2">Team</th>
          <th class="p-2">Value</th>
          <th class="p-2">Percent</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedTeamData as teamValue, i}
          <tr>
            <td class="p-2">{i + 1}</td>
            <td class="p-2">{teamValue.team}</td>
            <td class="p-2">{teamValue.value.toFixed(2)}</td>
            <td class="p-2">{teamValue.percentage.toFixed(2)}%</td>
          </tr>
        {/each}
      </tbody>
    </table>
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
