<script lang="ts">
  import type { ExpressionAsExpressionInput } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import CalculateExpressionDialog from "./CalculateExpressionDialog.svelte";
  import CalculatePickListDialog from "./CalculatePickListDialog.svelte";
  import DeletePickListDialog from "./DeletePickListDialog.svelte";
  import ExpressionDialog from "./ExpressionDialog.svelte";
  import PickListDialog from "./PickListDialog.svelte";

  let {
    idb,
    surveyRecord,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<MatchSurvey>;
  } = $props();

  $effect(() => {
    idb.transaction("surveys", "readwrite").objectStore("surveys").put($state.snapshot(surveyRecord));
  });

  let calculatePickListDialog = $state<CalculatePickListDialog | undefined>(undefined);
  let pickListDialog = $state<PickListDialog | undefined>(undefined);

  let calculateExpressionDialog = $state<CalculateExpressionDialog | undefined>(undefined);
  let expressionDialog = $state<ExpressionDialog | undefined>(undefined);

  let preselectedExpressionNames = $state<string[]>([]);
  let isSelecting = $state(false);

  let usedExpressionNames = $derived([
    ...surveyRecord.expressions
      .flatMap((e) => e.inputs)
      .filter((input): input is ExpressionAsExpressionInput => input.from == "expression")
      .map((input) => input.expressionName),
    ...surveyRecord.pickLists.flatMap((p) => p.weights).map((w) => w.expressionName),
  ]);

  const entriesByTeam: Record<string, IDBRecord<Entry>[]> = {};

  const entriesRequest = idb.transaction("entries").objectStore("entries").index("surveyId").getAll(surveyRecord.id);
  entriesRequest.onsuccess = () => {
    const entries = entriesRequest.result;
    if (!entries) return;

    for (const entry of entries) {
      if (entry.status == "draft") {
        continue;
      }

      if (entry.team in entriesByTeam) {
        entriesByTeam[entry.team] = [...entriesByTeam[entry.team], entry];
      } else {
        entriesByTeam[entry.team] = [entry];
      }
    }
  };
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Analysis</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  {#if surveyRecord.expressions.length}
    <h2 class="font-bold">Pick Lists</h2>
    <CalculatePickListDialog
      bind:this={calculatePickListDialog}
      pickLists={surveyRecord.pickLists}
      {entriesByTeam}
      expressions={surveyRecord.expressions}
    />

    {#if $modeStore == "admin"}
      <PickListDialog
        bind:this={pickListDialog}
        expressions={surveyRecord.expressions}
        bind:pickLists={surveyRecord.pickLists}
        {preselectedExpressionNames}
      />
    {/if}
    <div class="flex flex-col">
      {#each surveyRecord.pickLists as pickList, pickListIndex}
        <div class="flex flex-col gap-2 p-3">
          <Button onclick={() => calculatePickListDialog?.open(pickListIndex)}>
            <Icon name="list-ol" />
            {pickList.name}
          </Button>
          {#if $modeStore == "admin"}
            <div class="flex flex-wrap gap-2">
              <Button onclick={() => pickListDialog?.editPickList(pickListIndex)}>
                <Icon name="pen" />
                Edit
              </Button>
              <DeletePickListDialog bind:surveyRecord {pickListIndex} />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    To set up pick lists, first create some expressions.
  {/if}
</div>

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Expressions</h2>
  <CalculateExpressionDialog
    bind:this={calculateExpressionDialog}
    {entriesByTeam}
    expressions={surveyRecord.expressions}
  />

  {#if $modeStore == "admin"}
    <ExpressionDialog
      bind:this={expressionDialog}
      bind:expressions={surveyRecord.expressions}
      fields={surveyRecord.fields}
      bind:pickLists={surveyRecord.pickLists}
      {preselectedExpressionNames}
    />
    <div class="flex gap-2">
      <Button
        onclick={() => {
          if (isSelecting) {
            preselectedExpressionNames = [];
            isSelecting = false;
          } else {
            isSelecting = true;
          }
        }}
      >
        <Icon name="list-check" />
        {#if isSelecting}
          Stop selecting
        {:else}
          Select
        {/if}
      </Button>
      {#if isSelecting}
        <Button
          onclick={() => {
            if (preselectedExpressionNames.length) {
              preselectedExpressionNames = [];
            } else {
              preselectedExpressionNames = surveyRecord.expressions.map((expression) => expression.name);
            }
          }}
        >
          {#if preselectedExpressionNames.length}
            <Icon name="xmark" />
            Deselect all
          {:else}
            <Icon name="check" />
            Select all
          {/if}
        </Button>
      {/if}
    </div>
  {/if}

  <div class="flex flex-col">
    {#each surveyRecord.expressions as expression, expressionIndex}
      <div class="flex flex-col gap-2 p-3">
        {#if isSelecting}
          {@const isSelected = preselectedExpressionNames.includes(expression.name)}
          <Button
            onclick={() => {
              if (isSelected) {
                preselectedExpressionNames = preselectedExpressionNames.filter((name) => name != expression.name);
              } else {
                preselectedExpressionNames = [...preselectedExpressionNames, expression.name];
              }
            }}
          >
            {#if isSelected}
              <Icon name="square-check" />
            {:else}
              <Icon style="regular" name="square" />
            {/if}
            {expression.name}
          </Button>
        {:else}
          <Button onclick={() => calculateExpressionDialog?.open(expressionIndex)}>
            <Icon name="percent" />
            {expression.name}
          </Button>
          {#if $modeStore == "admin"}
            <div class="flex flex-wrap gap-2">
              <Button onclick={() => expressionDialog?.editExpression(expressionIndex)}>
                <Icon name="pen" />
                Edit
              </Button>
              {#if !usedExpressionNames.includes(expression.name)}
                <Button
                  onclick={() => (surveyRecord.expressions = surveyRecord.expressions.toSpliced(expressionIndex, 1))}
                >
                  <Icon name="trash" />
                  Delete
                </Button>
              {/if}
            </div>
          {/if}
        {/if}
      </div>
    {/each}
  </div>
</div>
