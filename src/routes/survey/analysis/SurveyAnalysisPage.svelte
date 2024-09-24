<script lang="ts">
  import type { ExpressionAsExpressionInput } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { MatchEntry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import DeletePickListDialog from "./DeletePickListDialog.svelte";
  import UpsertExpressionDialog from "./UpsertExpressionDialog.svelte";
  import UpsertPickListDialog from "./UpsertPickListDialog.svelte";
  import ViewExpressionDialog from "./ViewExpressionDialog.svelte";
  import ViewPickListDialog from "./ViewPickListDialog.svelte";

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

  let viewPickListDialog = $state<ViewPickListDialog | undefined>();
  let upsertPickListDialog = $state<UpsertPickListDialog | undefined>();
  let deletePickListDialog = $state<DeletePickListDialog | undefined>();

  let viewExpressionDialog = $state<ViewExpressionDialog | undefined>();
  let upsertExpressionDialog = $state<UpsertExpressionDialog | undefined>();

  let preselectedExpressionNames = $state<string[]>([]);
  let isSelecting = $state(false);

  let usedExpressionNames = $derived([
    ...surveyRecord.expressions
      .flatMap((e) => e.inputs)
      .filter((input): input is ExpressionAsExpressionInput => input.from == "expression")
      .map((input) => input.expressionName),
    ...surveyRecord.pickLists.flatMap((p) => p.weights).map((w) => w.expressionName),
  ]);

  function toggleIsSelecting() {
    if (isSelecting) {
      preselectedExpressionNames = [];
      isSelecting = false;
    } else {
      isSelecting = true;
    }
  }

  function toggleSelectAll() {
    if (preselectedExpressionNames.length) {
      preselectedExpressionNames = [];
    } else {
      preselectedExpressionNames = surveyRecord.expressions.map((expression) => expression.name);
    }
  }

  function toggleSelect(isSelected: boolean, name: string) {
    if (isSelected) {
      preselectedExpressionNames = preselectedExpressionNames.filter((n) => n != name);
    } else {
      preselectedExpressionNames = [...preselectedExpressionNames, name];
    }
  }
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Analysis</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  {#if surveyRecord.expressions.length}
    <h2 class="font-bold">Pick Lists</h2>
    <ViewPickListDialog
      bind:this={viewPickListDialog}
      bind:surveyRecord
      {upsertPickListDialog}
      {deletePickListDialog}
      {entriesByTeam}
    />
    <UpsertPickListDialog
      bind:this={upsertPickListDialog}
      bind:surveyRecord
      {preselectedExpressionNames}
      onupdate={() => viewPickListDialog?.refresh()}
    />
    <DeletePickListDialog
      bind:this={deletePickListDialog}
      bind:surveyRecord
      ondelete={() => viewPickListDialog?.close()}
    />

    {#if $modeStore == "admin"}
      <Button onclick={() => upsertPickListDialog?.newPickList()}>
        <Icon name="plus" />
        <div class="flex flex-col">
          New pick list
          {#if isSelecting}
            <small>From selected expressions</small>
          {/if}
        </div>
      </Button>
    {/if}

    <div class="flex flex-col gap-2">
      {#each surveyRecord.pickLists as pickList, pickListIndex}
        <Button onclick={() => viewPickListDialog?.open(pickListIndex)}>
          <Icon name="list-ol" />
          {pickList.name}
        </Button>
      {/each}
    </div>
  {:else}
    To set up pick lists, first create some expressions.
  {/if}
</div>

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Expressions</h2>
  <ViewExpressionDialog
    bind:this={viewExpressionDialog}
    bind:surveyRecord
    {upsertExpressionDialog}
    {entriesByTeam}
    {usedExpressionNames}
  />
  <UpsertExpressionDialog
    bind:this={upsertExpressionDialog}
    bind:surveyRecord
    {preselectedExpressionNames}
    onupdate={() => viewExpressionDialog?.refresh()}
  />

  {#if $modeStore == "admin"}
    <div class="flex flex-col gap-2">
      <Button onclick={() => upsertExpressionDialog?.newExpression()}>
        <Icon name="plus" />
        <div class="flex flex-col">
          New expression
          {#if isSelecting}
            <small>From selected expressions</small>
          {/if}
        </div>
      </Button>
      <div class="flex flex-wrap gap-2">
        <Button onclick={toggleIsSelecting}>
          <Icon name="list-check" />
          {#if isSelecting}
            Stop selecting
          {:else}
            Select
          {/if}
        </Button>
        {#if isSelecting}
          <Button onclick={toggleSelectAll}>
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
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    {#each surveyRecord.expressions as expression, expressionIndex}
      <div class="flex flex-col gap-2">
        {#if isSelecting}
          {@const isSelected = preselectedExpressionNames.includes(expression.name)}
          <Button onclick={() => toggleSelect(isSelected, expression.name)}>
            {#if isSelected}
              <Icon name="square-check" />
              <strong>{expression.name}</strong>
            {:else}
              <Icon style="regular" name="square" />
              {expression.name}
            {/if}
          </Button>
        {:else}
          <Button onclick={() => viewExpressionDialog?.open(expressionIndex)}>
            <Icon name="percent" />
            {expression.name}
          </Button>
        {/if}
      </div>
    {/each}
  </div>
</div>
