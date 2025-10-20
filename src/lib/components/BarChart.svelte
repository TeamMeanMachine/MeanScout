<script lang="ts">
  import { colors, type RankData } from "$lib/rank";
  import { getOrdinal, sessionStorageStore } from "$lib";
  import type { CompPageData } from "$lib/comp";
  import Anchor from "./Anchor.svelte";
  import { getFieldsWithDetails } from "$lib/field";
  import Button from "./Button.svelte";
  import { ChartBarBigIcon, ChartBarStackedIcon, XIcon } from "@lucide/svelte";

  let {
    pageData,
    rankData,
  }: {
    pageData: CompPageData;
    rankData: RankData;
  } = $props();

  const orderedSingleFields = $derived(
    getFieldsWithDetails(
      rankData.survey,
      pageData.fieldRecords.filter((f) => f.surveyId == rankData.survey.id),
    ).orderedSingle,
  );

  const inputNames = $derived.by(() => {
    if (rankData.type == "picklist") {
      return rankData.pickList.weights.map((w) => w.expressionName);
    } else if (rankData.type == "expression") {
      if (rankData.expression.input.from == "expressions") {
        return rankData.expression.input.expressionNames;
      } else if (rankData.expression.input.from == "fields") {
        return rankData.expression.input.fieldIds
          .map((id) => orderedSingleFields.find((f) => f.field.id == id)?.detailedName)
          .filter((f) => f !== undefined);
      }
    }
    return [];
  });

  const showInputs = sessionStorageStore<"true" | "">("metric-show-inputs", "true");
  const highlightedTeam = sessionStorageStore<string>("team-highlight", "");

  function inputUrl(name: string, i: number) {
    const path = `comp/${pageData.compRecord.id}/rank?surveyId=${encodeURIComponent(rankData.survey.id)}`;

    if (rankData.type == "picklist") {
      return `${path}&expression=${encodeURIComponent(name)}`;
    } else if (rankData.type == "expression") {
      if (rankData.expression.input.from == "expressions") {
        return `${path}&expression=${encodeURIComponent(name)}`;
      } else if (rankData.expression.input.from == "fields") {
        return `${path}&field=${encodeURIComponent(rankData.expression.input.fieldIds[i])}`;
      }
    }

    return location.hash;
  }
</script>

{#if $highlightedTeam || inputNames.length}
  <div class="flex flex-col gap-4">
    {#if $highlightedTeam}
      <div class="flex flex-col">
        <span class="text-xs font-light">Jump to</span>
        <div class="flex flex-wrap gap-2 text-sm">
          <Button
            onclick={() => {
              document
                .getElementById($highlightedTeam)
                ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
            }}
            class="py-1"
          >
            {$highlightedTeam}
          </Button>
          <Button onclick={() => ($highlightedTeam = "")} class="p-1!">
            <XIcon class="size-5" />
          </Button>
        </div>
      </div>
    {/if}

    {#if inputNames.length}
      <div class="flex flex-wrap gap-x-3 gap-y-2 text-xs">
        <Button
          onclick={() => ($showInputs = $showInputs ? "" : "true")}
          disabled={inputNames.length <= 1}
          class="py-1 {$showInputs ? 'font-bold' : 'font-light'}"
        >
          {#if $showInputs && inputNames.length > 1}
            <ChartBarStackedIcon class="text-theme size-5" />
          {:else}
            <ChartBarBigIcon class="text-theme size-5" />
          {/if}
        </Button>

        {#each inputNames as name, i}
          {@const color = colors[i % colors.length]}
          <Anchor route={inputUrl(name, i)}>
            {#if $showInputs && inputNames.length > 1}
              <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
            {/if}
            {name}
          </Anchor>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each rankData.teams as teamRank}
    {@const color = `rgb(var(--theme-color) / ${teamRank.percentage.toFixed(2)}%)`}

    <div id={teamRank.team} class="col-span-full grid grid-cols-subgrid">
      <Anchor
        route="comp/{pageData.compRecord.id}/team/{teamRank.team}"
        class="justify-center text-sm {$showInputs && inputNames.length > 1 ? 'mb-4' : ''}"
      >
        <div class="flex items-baseline">
          <span class="font-bold">{teamRank.rank}</span>
          <span class="hidden text-xs font-light sm:inline">{getOrdinal(teamRank.rank)}</span>
        </div>
      </Anchor>

      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div onclick={() => ($highlightedTeam = teamRank.team)} class="truncate">
        <div
          class={[
            "flex items-end justify-between gap-3",
            $highlightedTeam == teamRank.team && "border-x-[6px] border-neutral-400 bg-neutral-800 px-1",
          ]}
        >
          <div class="flex flex-col truncate">
            <span class="font-bold">{teamRank.team}</span>
            {#if teamRank.teamName}
              <span class={["truncate text-xs", $highlightedTeam == teamRank.team || "font-light"]}>
                {teamRank.teamName}
              </span>
            {/if}
          </div>
          {#if "value" in teamRank}
            {teamRank.value.toFixed(2)}
          {:else}
            <span>{teamRank.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
          {/if}
        </div>

        {#if $showInputs && inputNames.length > 1}
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
        {:else}
          <div class={$highlightedTeam == teamRank.team ? "bg-neutral-700" : "bg-neutral-800"}>
            <div style="background-color:{color};width:{teamRank.percentage.toFixed(2)}%;height:6px"></div>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>
