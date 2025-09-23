<script lang="ts">
  import { colors, type AnalysisData } from "$lib/analysis";
  import { getOrdinal, sessionStorageStore } from "$lib";
  import type { CompPageData } from "$lib/comp";
  import Anchor from "./Anchor.svelte";

  let {
    pageData,
    analysisData,
  }: {
    pageData: CompPageData;
    analysisData: AnalysisData;
  } = $props();

  const highlightedTeam = sessionStorageStore<string>("team-highlight", "");
</script>

<div class="flex flex-wrap gap-x-4 text-xs">
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

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each analysisData.data as teamData, rank}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      onclick={() => ($highlightedTeam = $highlightedTeam == teamData.team ? "" : teamData.team)}
      class="col-span-full grid grid-cols-subgrid"
    >
      <Anchor route="comp/{pageData.compRecord.id}/team/{teamData.team}" class="justify-center text-sm">
        <div class="flex items-baseline">
          <span class="font-bold">{rank + 1}</span>
          <span class="hidden text-xs font-light sm:inline">{getOrdinal(rank + 1)}</span>
        </div>
      </Anchor>

      <div>
        <div
          class={[
            "flex items-end justify-between gap-3",
            $highlightedTeam == teamData.team && "border-x-[6px] border-neutral-400 bg-neutral-800 px-1",
          ]}
        >
          <div class="flex flex-col">
            <span class="font-bold">{teamData.team}</span>
            {#if teamData.teamName}
              <span class={["text-xs", $highlightedTeam == teamData.team || "font-light"]}>{teamData.teamName}</span>
            {/if}
          </div>
          {#if "value" in teamData}
            {teamData.value.toFixed(2)}
          {:else}
            <span>{teamData.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
          {/if}
        </div>

        <div class={$highlightedTeam == teamData.team ? "bg-neutral-700" : "bg-neutral-800"}>
          <div class="flex gap-1" style="width:{teamData.percentage.toFixed(2)}%">
            {#if "value" in teamData && analysisData.type == "expression"}
              {#each teamData.inputs as input, i}
                {@const color = colors[i % colors.length]}
                {@const opacity = input.percentage.toFixed(2)}
                {@const divWidth = input.value * teamData.percentage}

                {#if divWidth}
                  <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                    <div style="background-color:{color};height:6px;opacity:{opacity}%"></div>
                  </div>
                {/if}
              {/each}
            {:else if !("value" in teamData) && analysisData.type == "picklist"}
              {#each analysisData.pickList.weights as weight, i}
                {@const color = colors[i % colors.length]}
                {@const opacity = ((teamData.inputs[i] / weight.percentage) * 100).toFixed(2)}
                {@const divWidth = teamData.inputs[i] * teamData.percentage}

                {#if divWidth}
                  <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                    <div style="background-color:{color};height:6px;opacity:{opacity}%"></div>
                  </div>
                {/if}
              {/each}
            {/if}
          </div>
        </div>

        <div class="flex gap-1" style="width:{teamData.percentage.toFixed(2)}%">
          {#if "value" in teamData && analysisData.type == "expression"}
            {#each teamData.inputs as input}
              {@const divWidth = input.value * teamData.percentage}
              {#if divWidth}
                <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                  <div class="text-center text-xs font-light">
                    {input.value.toFixed(2)}
                  </div>
                </div>
              {/if}
            {/each}
          {:else if !("value" in teamData) && analysisData.type == "picklist"}
            {#each analysisData.pickList.weights as weight, i}
              {@const divWidth = teamData.inputs[i] * teamData.percentage}
              {#if divWidth}
                <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                  <div class="text-center text-xs font-light">
                    {((teamData.inputs[i] / weight.percentage) * 100).toFixed(0)}%
                  </div>
                </div>
              {/if}
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/each}
</div>
