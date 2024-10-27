<script lang="ts">
  import type { ExpressionAsExpressionInput } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import NewExpressionDialog from "$lib/dialogs/NewExpressionDialog.svelte";
  import NewPickListDialog from "$lib/dialogs/NewPickListDialog.svelte";
  import ViewExpressionDialog from "$lib/dialogs/ViewExpressionDialog.svelte";
  import ViewPickListDialog from "$lib/dialogs/ViewPickListDialog.svelte";
  import type { MatchEntry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecords,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<MatchSurvey>;
    entryRecords: IDBRecord<MatchEntry>[];
  } = $props();

  const entriesByTeam: Record<string, IDBRecord<MatchEntry>[]> = {};
  for (const entry of entryRecords) {
    if (entry.team in entriesByTeam) {
      entriesByTeam[entry.team] = [...entriesByTeam[entry.team], entry];
    } else {
      entriesByTeam[entry.team] = [entry];
    }
  }

  let usedExpressionNames = $derived([
    ...surveyRecord.expressions
      .flatMap((e) => e.inputs)
      .filter((input): input is ExpressionAsExpressionInput => input.from == "expression")
      .map((input) => input.expressionName),
    ...surveyRecord.pickLists.flatMap((p) => p.weights).map((w) => w.expressionName),
  ]);
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Analysis</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Pick Lists</h2>

  {#if surveyRecord.expressions.length}
    {#if $modeStore == "admin"}
      <Button
        onclick={() => {
          openDialog(NewPickListDialog, { surveyRecord });
        }}
      >
        <Icon name="plus" />
        New pick list
      </Button>
    {/if}

    {#each surveyRecord.pickLists as pickList, index}
      <Button
        onclick={() => {
          openDialog(ViewPickListDialog, { surveyRecord, entriesByTeam, pickList, index, canEdit: true });
        }}
      >
        <Icon name="list-ol" />
        {pickList.name}
      </Button>
    {/each}
  {:else}
    To set up pick lists, first create some expressions.
  {/if}
</div>

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Expressions</h2>

  {#if $modeStore == "admin"}
    <div class="flex flex-col gap-2">
      <Button
        onclick={() => {
          openDialog(NewExpressionDialog, { surveyRecord });
        }}
      >
        <Icon name="plus" />
        New expression
      </Button>
    </div>
  {/if}

  {#each surveyRecord.expressions as expression, index}
    <Button
      onclick={() => {
        openDialog(ViewExpressionDialog, {
          surveyRecord,
          entriesByTeam,
          expression,
          index,
          usedExpressionNames,
          canEdit: true,
        });
      }}
    >
      <Icon name="percent" />
      {expression.name}
    </Button>
  {/each}
</div>
