<script lang="ts">
  import { SquareCheckBigIcon, SquareIcon, Trash2Icon, Undo2Icon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { EntryExpression, Expression, SurveyExpression } from "$lib/expression";
  import { isNumericField, type SingleFieldWithDetails } from "$lib/field";
  import type { PickList } from "$lib/rank";
  import type { MatchSurvey } from "$lib/survey";
  import DeletePickListDialog from "./DeletePickListDialog.svelte";
  import ResetPickListDialog from "./ResetPickListDialog.svelte";

  let {
    surveyRecord,
    orderedSingleFields,
    expressions,
    pickList,
    index,
    onupdate,
    onreset,
    ondelete,
  }: {
    surveyRecord: MatchSurvey;
    orderedSingleFields: SingleFieldWithDetails[];
    expressions: {
      entry: EntryExpression[];
      survey: SurveyExpression[];
    };
    pickList: PickList;
    index: number;
    onupdate(pickList: PickList): void;
    onreset(): void;
    ondelete(): void;
  } = $props();

  let changes = $state(structuredClone($state.snapshot(pickList)));
  let totalWeights = $derived(changes.weights.reduce((total, weight) => total + Math.abs(weight.percentage), 0));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      changes.name = changes.name.trim();

      if (!changes.name) {
        error = "name can't be empty!";
        return;
      }

      if (surveyRecord.pickLists.find((pl, i) => pl.name == changes.name && i != index)) {
        error = "name must be unique!";
        return;
      }

      changes.weights = changes.weights.filter((weight) => weight.percentage);
      onupdate(changes);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span class="text-sm">Edit pick list</span>

  <div class="flex gap-2">
    {#if Object.keys(pickList.customRanks || {}).length || Object.keys(pickList.omittedTeams || {}).length}
      <Button
        onclick={() => {
          openDialog(ResetPickListDialog, {
            onreset() {
              onreset();
              closeDialog();
            },
          });
        }}
      >
        <Undo2Icon class="size-5 text-theme" />
      </Button>
    {/if}

    <Button
      onclick={() => {
        openDialog(DeletePickListDialog, {
          ondelete() {
            ondelete();
            closeDialog();
          },
        });
      }}
    >
      <Trash2Icon class="size-5 text-theme" />
    </Button>
  </div>
</div>

<label class="flex flex-col">
  Name
  <!-- svelte-ignore a11y_autofocus -->
  <input bind:value={changes.name} autofocus class="bg-neutral-800 p-2 text-theme" />
</label>

{#snippet expressionButton(expression: Expression)}
  {@const weightIndex = changes.weights.findIndex(
    (weight) => weight.from != "field" && weight.expressionName == expression.name,
  )}
  {@const isWeight = weightIndex != -1}

  <div class="flex flex-col">
    <Button
      onclick={() => {
        if (isWeight) {
          changes.weights = changes.weights.toSpliced(weightIndex, 1);
        } else {
          changes.weights = [
            ...changes.weights,
            { from: "expression", expressionName: expression.name, percentage: 0 },
          ];
        }
      }}
    >
      {#if isWeight}
        <SquareCheckBigIcon class="text-theme" />
        <span class="text-base font-bold">{expression.name}</span>
      {:else}
        <SquareIcon class="text-theme" />
        {expression.name}
      {/if}
    </Button>
    {#if isWeight}
      <label class="m-2 ml-10 flex flex-col self-start">
        Weight
        <input
          type="number"
          min="-100"
          max="100"
          step="1"
          bind:value={changes.weights[weightIndex].percentage}
          class="bg-neutral-800 p-2 text-theme"
        />
      </label>
    {/if}
  </div>
{/snippet}

<div class="flex max-h-[500px] flex-col gap-4 overflow-auto p-1 text-sm">
  {#if expressions.survey.length}
    <div class="flex flex-col gap-2">
      <span>Aggregate Expressions</span>
      {#each expressions.survey as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}

  {#if expressions.entry.length}
    <div class="flex flex-col gap-2">
      <span>Entry Expressions</span>
      {#each expressions.entry as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <span>Fields</span>
    {#each orderedSingleFields.filter(isNumericField) as field (field.field.id)}
      {@const weightIndex = changes.weights.findIndex(
        (weight) => weight.from == "field" && weight.fieldId == field.field.id,
      )}
      {@const isWeight = changes.weights.some((weight) => weight.from == "field" && weight.fieldId == field.field.id)}

      <Button
        onclick={() => {
          if (isWeight) {
            changes.weights = changes.weights.toSpliced(weightIndex, 1);
          } else {
            changes.weights = [...changes.weights, { from: "field", fieldId: field.field.id, percentage: 0 }];
          }
        }}
      >
        {#if isWeight}
          <SquareCheckBigIcon class="text-theme" />
          <span class="text-base font-bold">{field.detailedName}</span>
        {:else}
          <SquareIcon class="text-theme" />
          {field.detailedName}
        {/if}
      </Button>
      {#if isWeight}
        <label class="m-2 ml-10 flex flex-col self-start">
          Weight
          <input
            type="number"
            min="-100"
            max="100"
            step="1"
            bind:value={changes.weights[weightIndex].percentage}
            class="bg-neutral-800 p-2 text-theme"
          />
        </label>
      {/if}
    {/each}
  </div>
</div>

<span>Total weights: {totalWeights}%</span>

{#if error}
  <span>Error: {error}</span>
{/if}
