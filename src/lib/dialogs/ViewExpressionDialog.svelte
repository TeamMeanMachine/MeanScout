<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type Expression } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { MatchEntry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import UpsertExpressionDialog from "./UpsertExpressionDialog.svelte";

  let {
    entriesByTeam,
    upsertExpressionDialog,
    surveyRecord = $bindable(),
    usedExpressionNames = undefined,
  }: {
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    upsertExpressionDialog: UpsertExpressionDialog | undefined;
    surveyRecord: IDBRecord<MatchSurvey>;
    usedExpressionNames?: string[] | undefined;
  } = $props();

  let dialog: Dialog;

  let expressionIndex = $state(-1);
  let expression = $state<Expression>({ name: "", type: "average", inputs: [] });
  let sortedTeamData = $state<{ team: string; percentage: number; value: number }[]>([]);

  export function open(index: number) {
    expressionIndex = index;
    refresh();
    dialog.open();
  }

  export function refresh() {
    expression = surveyRecord.expressions[expressionIndex];

    const teamData = calculateTeamData(expression.name, surveyRecord.expressions, entriesByTeam);
    const normalizedTeamData = normalizeTeamData(teamData);

    sortedTeamData = Object.keys(normalizedTeamData)
      .map((team) => ({ team, percentage: normalizedTeamData[team], value: teamData[team] }))
      .toSorted((a, b) => b.value - a.value);
  }

  export function close() {
    dialog.close();
  }

  function onclose() {
    expressionIndex = -1;
    expression = { name: "", type: "average", inputs: [] };
    sortedTeamData = [];
  }
</script>

<Dialog bind:this={dialog} {onclose}>
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

  {#if $modeStore == "admin"}
      <Button onclick={() => upsertExpressionDialog?.editExpression(expressionIndex)}>
        <Icon name="pen" />
        Edit
      </Button>
      {#if !usedExpressionNames?.includes(expression.name)}
        <Button
          onclick={() => {
            surveyRecord.expressions = surveyRecord.expressions.toSpliced(expressionIndex, 1);
            dialog.close();
          }}
        >
          <Icon name="trash" />
          Delete
        </Button>
      {/if}
  {/if}
</Dialog>
