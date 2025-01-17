<script lang="ts">
  import type { Expression, PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import DeletePickListDialog from "./DeletePickListDialog.svelte";

  let {
    expressions,
    pickList,
    onupdate,
    ondelete,
  }: {
    expressions: {
      derived: Expression[];
      primitive: Expression[];
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

<span>Edit pick list</span>

<label class="flex flex-col">
  Name
  <input bind:value={changes.name} class="bg-neutral-800 p-2 text-theme" />
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
          bind:value={changes.weights[weightIndex].percentage}
          class="bg-neutral-800 p-2 text-theme"
        />
      </label>
    {/if}
  </div>
{/snippet}

<div class="flex max-h-[500px] flex-col gap-4 overflow-auto p-1">
  {#if expressions.derived.length}
    <div class="flex flex-col gap-2">
      <span>Expressions <small>(from expressions)</small></span>
      {#each expressions.derived as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
  {#if expressions.primitive.length}
    <div class="flex flex-col gap-2">
      <span>Expressions <small>(from fields)</small></span>
      {#each expressions.primitive as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}
</div>

<span>Total weights: {totalWeights}%</span>

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
  <Icon name="trash" />
  Delete
</Button>
