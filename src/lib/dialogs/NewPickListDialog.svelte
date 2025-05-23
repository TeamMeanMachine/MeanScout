<script lang="ts">
  import type { PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Expression } from "$lib/expression";
  import { SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";

  let {
    expressions,
    oncreate,
  }: {
    expressions: {
      entryDerived: Expression[];
      entryTba: Expression[];
      entryPrimitive: Expression[];
      surveyDerived: Expression[];
      surveyTba: Expression[];
      surveyPrimitive: Expression[];
    };
    oncreate: (pickList: PickList) => void;
  } = $props();

  let pickList = $state<PickList>({ name: "", weights: [] });
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
  {#if expressions.surveyDerived.length}
    <div class="flex flex-col gap-2">
      <span>Survey Expressions <span class="text-x">(from expressions)</span></span>
      {#each expressions.surveyDerived as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
  {#if expressions.surveyTba.length}
    <div class="flex flex-col gap-2">
      <span>Survey Expressions <span class="text-xs">(from TBA)</span></span>
      {#each expressions.surveyTba as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
  {#if expressions.surveyPrimitive.length}
    <div class="flex flex-col gap-2">
      <span>Survey Expressions <span class="text-xs">(from fields)</span></span>
      {#each expressions.surveyPrimitive as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
  {#if expressions.entryDerived.length}
    <div class="flex flex-col gap-2">
      <span>Entry Expressions <span class="text-xs">(from expressions)</span></span>
      {#each expressions.entryDerived as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
  {#if expressions.entryTba.length}
    <div class="flex flex-col gap-2">
      <span>Entry Expressions <span class="text-xs">(from TBA)</span></span>
      {#each expressions.entryTba as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
  {#if expressions.entryPrimitive.length}
    <div class="flex flex-col gap-2">
      <span>Entry Expressions <span class="text-xs">(from fields)</span></span>
      {#each expressions.entryPrimitive as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
</div>

<span>Total weights: {totalWeights}%</span>
