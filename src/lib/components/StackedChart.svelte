<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import { colors, type AnalysisData } from "$lib/analysis";
  import Button from "./Button.svelte";

  let {
    analysisData,
  }: {
    analysisData: Extract<AnalysisData, { type: "picklist" }>;
  } = $props();

  const showWeights = sessionStorageStore<"" | "true">("stacked-chart-show-weights", "");
</script>

<Button onclick={() => ($showWeights = $showWeights ? "" : "true")} class="gap-x-4 text-sm">
  {#if $showWeights}
    {#each analysisData.sortedWeights as weight, i}
      {@const color = colors[i % colors.length]}
      <div>
        <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
        {weight.expressionName} ({weight.percentage}%)
      </div>
    {/each}
  {:else}
    Show weights
  {/if}
</Button>

<div class="grid gap-x-1 gap-y-4" style="grid-template-columns:min-content auto">
  {#each analysisData.data as { team, teamName, percentage, weights }, i}
    <div class="flex flex-col justify-center pr-2 text-center text-sm font-bold">{i + 1}</div>

    <div>
      <div class="flex items-end justify-between gap-3">
        <div class="flex flex-col">
          <strong>{team}</strong>
          {#if teamName}
            <small class="font-light">{teamName}</small>
          {/if}
        </div>
        {percentage.toFixed(1)}%
      </div>
      <div class="bg-neutral-800">
        <div class="flex gap-1" style="width:{percentage.toFixed(2)}%">
          {#each analysisData.sortedWeights as weight, i}
            {@const color = colors[i % colors.length]}
            {@const opacity = ((weights[weight.expressionName] / weight.percentage) * 100).toFixed(2)}
            {@const divWidth = weights[weight.expressionName] * percentage}
            {#if divWidth}
              <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                <div style="background-color:{color};height:6px;opacity:{opacity}%"></div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
      <div class="flex gap-1" style="width:{percentage.toFixed(2)}%">
        {#each analysisData.sortedWeights as weight}
          {@const divWidth = weights[weight.expressionName] * percentage}
          {#if divWidth}
            <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
              <div class="text-center text-sm font-light">
                {((weights[weight.expressionName] / weight.percentage) * 100).toFixed(0)}%
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/each}
</div>
