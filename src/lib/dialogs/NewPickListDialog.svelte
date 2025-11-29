<script lang="ts">
  import type { PickList } from "$lib/rank";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { EntryExpression, Expression, SurveyExpression } from "$lib/expression";
  import { SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import type { MatchSurvey } from "$lib/survey";
  import { isNumericField, type SingleFieldWithDetails } from "$lib/field";

  let {
    surveyRecord,
    orderedSingleFields,
    expressions,
    oncreate,
  }: {
    surveyRecord: MatchSurvey;
    orderedSingleFields: SingleFieldWithDetails[];
    expressions: {
      entry: EntryExpression[];
      survey: SurveyExpression[];
    };
    oncreate: (pickList: PickList) => void;
  } = $props();

  let pickList = $state<PickList>({ name: "", weights: [] });
  let totalWeights = $derived(pickList.weights.reduce((total, weight) => total + Math.abs(weight.percentage), 0));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      pickList.name = pickList.name.trim();

      if (!pickList.name) {
        error = "name can't be empty!";
        return;
      }

      if (surveyRecord.pickLists.find((pl) => pl.name == pickList.name)) {
        error = "name must be unique!";
        return;
      }

      pickList.weights = pickList.weights.filter((weight) => weight.percentage);
      oncreate(pickList);
      closeDialog();
    },
  };
</script>

<span>New pick list</span>

<label class="flex flex-col">
  Name
  <input bind:value={pickList.name} class="text-theme bg-neutral-800 p-2" />
</label>

{#snippet expressionButton(expression: Expression)}
  {@const weightIndex = pickList.weights.findIndex(
    (weight) => weight.from != "field" && weight.expressionName == expression.name,
  )}
  {@const isWeight = weightIndex != -1}

  <div class="flex flex-col">
    <Button
      onclick={() => {
        if (isWeight) {
          pickList.weights = pickList.weights.toSpliced(weightIndex, 1);
        } else {
          pickList.weights = [
            ...pickList.weights,
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
          bind:value={pickList.weights[weightIndex].percentage}
          class="text-theme bg-neutral-800 p-2"
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
      {@const weightIndex = pickList.weights.findIndex(
        (weight) => weight.from == "field" && weight.fieldId == field.field.id,
      )}
      {@const isWeight = pickList.weights.some((weight) => weight.from == "field" && weight.fieldId == field.field.id)}

      <Button
        onclick={() => {
          if (isWeight) {
            pickList.weights = pickList.weights.toSpliced(weightIndex, 1);
          } else {
            pickList.weights = [...pickList.weights, { from: "field", fieldId: field.field.id, percentage: 0 }];
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
            bind:value={pickList.weights[weightIndex].percentage}
            class="text-theme bg-neutral-800 p-2"
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
