<script lang="ts">
  import type { PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { Expression } from "$lib/expression";
  import { SquareCheckBigIcon, SquareIcon, Trash2Icon } from "@lucide/svelte";
  import DeletePickListDialog from "./DeletePickListDialog.svelte";

  let {
    expressions,
    pickList,
    onupdate,
    ondelete,
  }: {
    expressions: {
      entryDerived: Expression[];
      entryTba: Expression[];
      entryPrimitive: Expression[];
      surveyDerived: Expression[];
      surveyTba: Expression[];
      surveyPrimitive: Expression[];
    };
    pickList: PickList;
    onupdate: (pickList: PickList) => void;
    ondelete: () => void;
  } = $props();

  let changes = $state(structuredClone($state.snapshot(pickList)));
  let totalWeights = $derived(changes.weights.reduce((total, weight) => total + Math.abs(weight.percentage), 0));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      changes.weights = changes.weights.filter((weight) => weight.percentage);
      onupdate(changes);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span class="text-sm">Edit pick list</span>

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
    <Trash2Icon class="text-theme size-5" />
  </Button>
</div>

<label class="flex flex-col">
  Name
  <!-- svelte-ignore a11y_autofocus -->
  <input bind:value={changes.name} autofocus class="text-theme bg-neutral-800 p-2" />
</label>

{#snippet expressionButton(expression: Expression)}
  {@const weightIndex = changes.weights.findIndex((weight) => weight.expressionName == expression.name)}
  {@const isWeight = weightIndex != -1}

  <div class="flex flex-col">
    <Button
      onclick={() => {
        if (isWeight) {
          changes.weights = changes.weights.toSpliced(weightIndex, 1);
        } else {
          changes.weights = [...changes.weights, { expressionName: expression.name, percentage: 0 }];
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
          class="text-theme bg-neutral-800 p-2"
        />
      </label>
    {/if}
  </div>
{/snippet}

<div class="flex max-h-[500px] flex-col gap-4 overflow-auto p-1 text-sm">
  {#if expressions.surveyDerived.length}
    <div class="flex flex-col gap-2">
      <span>Survey Expressions <span class="text-xs">(from expressions)</span></span>
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
