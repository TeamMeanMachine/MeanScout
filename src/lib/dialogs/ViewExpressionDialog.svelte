<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type Expression } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { MatchEntry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import EditExpressionDialog from "./EditExpressionDialog.svelte";

  let {
    surveyRecord,
    entriesByTeam,
    expression,
    index,
    usedExpressionNames,
    canEdit,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    expression: Expression;
    index: number;
    usedExpressionNames?: string[] | undefined;
    canEdit?: boolean;
  } = $props();

  let sortedTeamData = $state<{ team: string; percentage: number; value: number }[]>([]);

  export const { onopen }: DialogExports = {
    onopen(open) {
      refresh();
      open();
    },
  };

  function refresh() {
    expression = surveyRecord.expressions[index];

    const teamData = calculateTeamData(expression.name, surveyRecord.expressions, entriesByTeam);
    const normalizedTeamData = normalizeTeamData(teamData);

    sortedTeamData = Object.keys(normalizedTeamData)
      .map((team) => ({ team, percentage: normalizedTeamData[team], value: teamData[team] }))
      .toSorted((a, b) => b.value - a.value);
  }
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
{/if}

{#if $modeStore == "admin" && canEdit}
  <Button
    onclick={() => {
      openDialog(EditExpressionDialog, { surveyRecord, index, onupdate: () => refresh() });
    }}
  >
    <Icon name="pen" />
    Edit
  </Button>
  {#if !usedExpressionNames?.includes(expression.name)}
    <Button
      onclick={() => {
        surveyRecord.expressions = surveyRecord.expressions.toSpliced(index, 1);
        closeDialog();
      }}
    >
      <Icon name="trash" />
      Delete
    </Button>
  {/if}
{/if}
