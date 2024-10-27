<script lang="ts">
  import type { PickList } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { MatchSurvey } from "$lib/survey";

  let {
    surveyRecord,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
  } = $props();

  let pickList = $state<PickList>({ name: "New pick list", weights: [] });
  let totalWeights = $derived(pickList.weights.reduce((total, weight) => total + Math.abs(weight.percentage), 0));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      pickList.weights = pickList.weights.filter((weight) => weight.percentage);
      surveyRecord.pickLists = [...surveyRecord.pickLists, structuredClone($state.snapshot(pickList))];
      surveyRecord.modified = new Date();
      closeDialog();
    },
  };
</script>

<span>New pick list</span>

<label class="flex flex-col">
  Name
  <input bind:value={pickList.name} class="bg-neutral-800 p-2 text-theme" />
</label>

<span>Expressions</span>

<div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
  {#each surveyRecord.expressions as expression}
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
            class="bg-neutral-800 p-2 text-theme"
          />
        </label>
      {/if}
    </div>
  {/each}
</div>

<span>Total weights: {totalWeights}%</span>
