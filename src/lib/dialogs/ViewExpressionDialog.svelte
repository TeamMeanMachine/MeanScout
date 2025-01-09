<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type Expression } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import type { MatchEntry } from "$lib/entry";
  import type { DetailedSingleField } from "$lib/field";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import EditExpressionDialog from "./EditExpressionDialog.svelte";

  let {
    surveyRecord,
    fields,
    expressions,
    entriesByTeam,
    expression,
    index,
    usedExpressionNames,
    input,
    onupdate,
    ondelete,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fields: DetailedSingleField[];
    expressions?: {
      derived: Expression[];
      primitive: Expression[];
      mixed: Expression[];
    };
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    expression: Expression;
    index: number;
    usedExpressionNames?: string[] | undefined;
    input?: "expressions" | "fields";
    onupdate?: (expression: Expression) => void;
    ondelete?: () => void;
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

  function expressionReferencesOther(e: Expression, other: Expression) {
    for (const input of e.inputs.filter((input) => input.from == "expression")) {
      if (input.expressionName == other.name) {
        return true;
      }

      const newExp = surveyRecord.expressions.find((newExp) => newExp.name == input.expressionName);
      if (newExp && expressionReferencesOther(newExp, e)) {
        return true;
      }
    }

    return false;
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

{#if $modeStore == "admin"}
  {#if onupdate && expressions}
    <Button
      onclick={() => {
        openDialog(EditExpressionDialog, {
          surveyRecord,
          fields,
          expressions: {
            derived: expressions.derived.filter(
              (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
            ),
            primitive: expressions.primitive.filter(
              (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
            ),
            mixed: expressions.mixed.filter(
              (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
            ),
          },
          expression,
          index,
          input,
          onupdate(changes) {
            expression = changes;
            onupdate(changes);
          },
        });
      }}
    >
      <Icon name="pen" />
      Edit
    </Button>
  {/if}
  {#if !usedExpressionNames?.includes(expression.name) && ondelete}
    <Button
      onclick={() => {
        ondelete();
        closeDialog();
      }}
    >
      <Icon name="trash" />
      Delete
    </Button>
  {/if}
{/if}
