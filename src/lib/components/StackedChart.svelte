<script lang="ts">
  import { colors, type RankData } from "$lib/rank";
  import { getOrdinal, sessionStorageStore } from "$lib";
  import type { CompPageData } from "$lib/comp";
  import Anchor from "./Anchor.svelte";

  let {
    pageData,
    rankData,
  }: {
    pageData: CompPageData;
    rankData: RankData;
  } = $props();

  const highlightedTeam = sessionStorageStore<string>("team-highlight", "");

  function getParamsForInput(index: number) {
    if (rankData.type == "picklist") {
      return `surveyId=${encodeURIComponent(rankData.survey.id)}&expression=${rankData.pickList.weights[index].expressionName}`;
    } else if (rankData.type == "expression") {
      if (rankData.expression.input.from == "expressions") {
        return `surveyId=${encodeURIComponent(rankData.survey.id)}&expression=${rankData.expression.input.expressionNames[index]}`;
      } else if (rankData.expression.input.from == "fields") {
        return `surveyId=${encodeURIComponent(rankData.survey.id)}&field=${rankData.expression.input.fieldIds[index]}`;
      }
    }
  }
</script>

<div class="flex flex-wrap gap-x-3 gap-y-2 text-xs">
  {#if rankData.type == "picklist"}
    {#each rankData.pickList.weights as weight, i}
      {@const color = colors[i % colors.length]}
      <Anchor route="comp/{pageData.compRecord.id}/rank?{getParamsForInput(i)}">
        <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
        {weight.expressionName} ({weight.percentage}%)
      </Anchor>
    {/each}
  {:else if rankData.type == "expression" && rankData.inputs.length > 1}
    {#each rankData.inputs as { name }, i}
      {@const color = colors[i % colors.length]}

      <Anchor route="comp/{pageData.compRecord.id}/rank?{getParamsForInput(i)}">
        <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
        {name}
      </Anchor>
    {/each}
  {/if}
</div>

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each rankData.teams as teamRank}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      onclick={() => ($highlightedTeam = $highlightedTeam == teamRank.team ? "" : teamRank.team)}
      class="col-span-full grid grid-cols-subgrid"
    >
      <Anchor route="comp/{pageData.compRecord.id}/team/{teamRank.team}" class="justify-center text-sm">
        <div class="flex items-baseline">
          <span class="font-bold">{teamRank.rank}</span>
          <span class="hidden text-xs font-light sm:inline">{getOrdinal(teamRank.rank)}</span>
        </div>
      </Anchor>

      <div>
        <div
          class={[
            "flex items-end justify-between gap-3",
            $highlightedTeam == teamRank.team && "border-x-[6px] border-neutral-400 bg-neutral-800 px-1",
          ]}
        >
          <div class="flex flex-col">
            <span class="font-bold">{teamRank.team}</span>
            {#if teamRank.teamName}
              <span class={["text-xs", $highlightedTeam == teamRank.team || "font-light"]}>{teamRank.teamName}</span>
            {/if}
          </div>
          {#if "value" in teamRank}
            {teamRank.value.toFixed(2)}
          {:else}
            <span>{teamRank.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
          {/if}
        </div>

        <div class={$highlightedTeam == teamRank.team ? "bg-neutral-700" : "bg-neutral-800"}>
          <div class="flex" style="width:{teamRank.percentage.toFixed(2)}%">
            {#if "value" in teamRank && rankData.type != "picklist"}
              {#each teamRank.inputs as input, i}
                {@const color = colors[i % colors.length]}
                {@const opacity = input.percentage.toFixed(2)}
                {@const divWidth = input.value * teamRank.percentage}

                {#if divWidth}
                  <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                    <div
                      class="border-x-2"
                      style="background-color:{color};height:6px;opacity:{opacity}%;border-color:rgba(0,0,0,0.25)"
                    ></div>
                  </div>
                {/if}
              {/each}
            {:else if !("value" in teamRank) && rankData.type == "picklist"}
              {#each rankData.pickList.weights as weight, i}
                {@const color = colors[i % colors.length]}
                {@const opacity = ((teamRank.inputs[i] / weight.percentage) * 100).toFixed(2)}
                {@const divWidth = teamRank.inputs[i] * teamRank.percentage}

                {#if divWidth}
                  <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                    <div
                      class="border-x-2"
                      style="background-color:{color};height:6px;opacity:{opacity}%;border-color:rgba(0,0,0,0.25)"
                    ></div>
                  </div>
                {/if}
              {/each}
            {/if}
          </div>
        </div>

        <div class="flex text-center text-xs font-light" style="width:{teamRank.percentage.toFixed(2)}%">
          {#if "value" in teamRank && rankData.type != "picklist"}
            {#each teamRank.inputs as input}
              {@const divWidth = input.value * teamRank.percentage}
              {#if divWidth}
                <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                  <div>{input.value.toFixed()}</div>
                </div>
              {/if}
            {/each}
          {:else if !("value" in teamRank) && rankData.type == "picklist"}
            {#each rankData.pickList.weights as weight, i}
              {@const divWidth = teamRank.inputs[i] * teamRank.percentage}
              {#if divWidth}
                <div class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                  <div>{((teamRank.inputs[i] / weight.percentage) * 100).toFixed(0)}%</div>
                </div>
              {/if}
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/each}
</div>
