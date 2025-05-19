<script lang="ts">
  import { colors, type AnalysisData } from "$lib/analysis";

  let {
    analysisData,
  }: {
    analysisData: AnalysisData;
  } = $props();
</script>

<div class="flex flex-wrap gap-x-4 text-sm">
  {#if analysisData.type == "picklist"}
    {#each analysisData.pickList.weights as weight, i}
      {@const color = colors[i % colors.length]}
      <div>
        <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
        {weight.expressionName} ({weight.percentage}%)
      </div>
    {/each}
  {:else}
    {#each analysisData.inputs as { name }, i}
      {@const color = colors[i % colors.length]}
      <div>
        <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
        {name}
      </div>
    {/each}
  {/if}
</div>

<div class="grid gap-x-1 gap-y-4" style="grid-template-columns:min-content auto">
  {#if analysisData.type == "picklist"}
    {#each analysisData.data as { team, teamName, percentage, inputs }, i}
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
            {#each analysisData.pickList.weights as weight, i}
              {@const color = colors[i % colors.length]}
              {@const opacity = ((inputs[i] / weight.percentage) * 100).toFixed(2)}
              {@const divWidth = inputs[i] * percentage}
              {#if divWidth}
                <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                  <div style="background-color:{color};height:6px;opacity:{opacity}%"></div>
                </div>
              {/if}
            {/each}
          </div>
        </div>
        <div class="flex gap-1" style="width:{percentage.toFixed(2)}%">
          {#each analysisData.pickList.weights as weight, i}
            {@const divWidth = inputs[i] * percentage}
            {#if divWidth}
              <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                <div class="text-center text-sm font-light">
                  {((inputs[i] / weight.percentage) * 100).toFixed(0)}%
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  {:else}
    {#each analysisData.data as { team, teamName, value, percentage, inputs }, rank}
      <div class="flex flex-col justify-center pr-2 text-center text-sm font-bold">{rank + 1}</div>

      <div>
        <div class="flex items-end justify-between gap-3">
          <div class="flex flex-col">
            <strong>{team}</strong>
            {#if teamName}
              <small class="font-light">{teamName}</small>
            {/if}
          </div>
          {value.toFixed(2)}
        </div>
        <div class="bg-neutral-800">
          <div class="flex gap-1" style="width:{percentage.toFixed(2)}%">
            {#each inputs as input, i}
              {@const color = colors[i % colors.length]}
              {@const opacity = input.percentage.toFixed(2)}
              {@const divWidth = input.value * percentage}

              {#if divWidth}
                <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                  <div style="background-color:{color};height:6px;opacity:{opacity}%"></div>
                </div>
              {/if}
            {/each}
          </div>
        </div>
        <div class="flex gap-1" style="width:{percentage.toFixed(2)}%">
          {#each inputs as input}
            {@const divWidth = input.value * percentage}
            {#if divWidth}
              <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                <div class="text-center text-sm font-light">
                  {input.value.toFixed(2)}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
