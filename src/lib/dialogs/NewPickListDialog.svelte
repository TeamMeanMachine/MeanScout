<script lang="ts">
  import type { PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Expression } from "$lib/expression";

  let {
    expressions,
    oncreate,
  }: {
    expressions: {
      surveyDerived: Expression[];
      surveyPrimitive: Expression[];
    };
    oncreate: (pickList: PickList) => void;
  } = $props();

  let pickList = $state<PickList>({ name: "New pick list", weights: [] });
  let totalWeights = $derived(pickList.weights.reduce((total, weight) => total + Math.abs(weight.percentage), 0));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
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
  {@const weightIndex = pickList.weights.findIndex((weight) => weight.expressionName == expression.name)}
  {@const isWeight = weightIndex != -1}

  <div class="flex flex-col">
    <Button
      onclick={() => {
        if (isWeight) {
          pickList.weights = pickList.weights.toSpliced(weightIndex, 1);
        } else {
          pickList.weights = [...pickList.weights, { expressionName: expression.name, percentage: 0 }];
        }
      }}
    >
      {#if isWeight}
        <Icon name="square-check" />
        <strong>{expression.name}</strong>
      {:else}
        <Icon style="regular" name="square" />
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

<div class="flex max-h-[500px] flex-col gap-4 overflow-auto p-1">
  {#if expressions.surveyDerived.length}
    <div class="flex flex-col gap-2">
      <span>Survey Expressions <small>(from expressions)</small></span>
      {#each expressions.surveyDerived as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
  {#if expressions.surveyPrimitive.length}
    <div class="flex flex-col gap-2">
      <span>Survey Expressions <small>(from fields)</small></span>
      {#each expressions.surveyPrimitive as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
</div>

<span>Total weights: {totalWeights}%</span>
