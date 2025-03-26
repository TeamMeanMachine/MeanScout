<script lang="ts">
  import type { Expression } from "$lib/expression";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import ViewExpressionDialog from "$lib/dialogs/ViewExpressionDialog.svelte";
  import ViewPickListDialog from "$lib/dialogs/ViewPickListDialog.svelte";
  import type { PageData } from "./$types";
  import { sessionStorageStore } from "$lib";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let search = sessionStorageStore("analysis-search", "");
  let formattedSearch = $derived(formatName($search));

  let filteredExpressions = $derived.by(() => {
    return data.surveyRecord.expressions.filter((e) => {
      if (!formattedSearch || formatName(e.name).includes(formattedSearch)) {
        return true;
      }

      if (
        e.input.from == "expressions" &&
        e.input.expressionNames.some((en) => formatName(en).includes(formattedSearch))
      ) {
        return true;
      }

      return false;
    });
  });

  let expressions = $derived({
    entryDerived: filteredExpressions.filter((e) => e.scope == "entry" && e.input.from == "expressions"),
    entryTba: filteredExpressions.filter((e) => e.scope == "entry" && e.input.from == "tba"),
    entryPrimitive: filteredExpressions.filter((e) => e.scope == "entry" && e.input.from == "fields"),
    surveyDerived: filteredExpressions.filter((e) => e.scope == "survey" && e.input.from == "expressions"),
    surveyTba: filteredExpressions.filter((e) => e.scope == "survey" && e.input.from == "tba"),
    surveyPrimitive: filteredExpressions.filter((e) => e.scope == "survey" && e.input.from == "fields"),
  });

  let pickLists = $derived.by(() => {
    return data.surveyRecord.pickLists.filter((pl) => {
      if (!formattedSearch || formatName(pl.name).includes(formattedSearch)) {
        return true;
      }

      return pl.weights.some((w) => formatName(w.expressionName).includes(formattedSearch));
    });
  });

  function formatName(name: string) {
    return name.trim().replaceAll(" ", "").toLowerCase();
  }

  function nameWeight(name: string) {
    if (!formattedSearch) return "";
    return formatName(name).includes(formattedSearch) ? "font-bold" : "font-light";
  }
</script>

<Header
  title="Analysis - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Analysis" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-6" style="view-transition-name:analysis">
  {#if data.fields.length == 0}
    <span>No fields.</span>
  {:else}
    <div class="flex flex-wrap gap-2">
      <label class="flex flex-col">
        Search
        <input bind:value={$search} class="text-theme bg-neutral-800 p-2" />
      </label>
    </div>

    {#if data.surveyRecord.pickLists.length}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">Pick Lists</h2>
        {#each pickLists as pickList}
          <div class="flex flex-col gap-2">
            <Button
              onclick={() => {
                openDialog(ViewPickListDialog, {
                  surveyRecord: data.surveyRecord,
                  fields: data.fields,
                  entriesByTeam: data.entriesByTeam,
                  pickList,
                });
              }}
              class={nameWeight(pickList.name)}
            >
              {pickList.name}
            </Button>

            <div class="mb-3 ml-3 flex flex-col gap-2">
              {#each pickList.weights.toSorted((a, b) => b.percentage - a.percentage) as { expressionName, percentage }}
                {@const expression = data.surveyRecord.expressions.find((e) => e.name == expressionName)}
                {#if expression}
                  <Button
                    onclick={() => {
                      openDialog(ViewExpressionDialog, {
                        surveyRecord: data.surveyRecord,
                        fields: data.fields,
                        entriesByTeam: data.entriesByTeam,
                        expression,
                      });
                    }}
                    class="flex-col items-start gap-0! {nameWeight(expression.name)}"
                  >
                    {expression.name}
                    <small class="font-light">{percentage}%</small>
                  </Button>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if expressions.surveyDerived.length}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">Survey Expressions <small>(from expressions)</small></h2>
        {#each expressions.surveyDerived as expression}
          {@const expressionNames = expression.input.from == "expressions" ? expression.input.expressionNames : []}
          <div class="flex flex-col gap-3">
            {@render expressionButton(expression)}
            <div class="mb-3 ml-3 flex flex-col gap-2">
              {#each expressionNames as expressionName}
                {@const expression = data.surveyRecord.expressions.find((e) => e.name == expressionName)}
                {#if expression}
                  {@render expressionButton(expression)}
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if expressions.surveyTba.length}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">Survey Expressions <small>(from TBA)</small></h2>
        <div class="flex flex-col gap-4">
          {#each expressions.surveyTba as expression}
            {@render expressionButton(expression)}
          {/each}
        </div>
      </div>
    {/if}

    {#if expressions.surveyPrimitive.length}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">Survey Expressions <small>(from fields)</small></h2>
        <div class="flex flex-col gap-4">
          {#each expressions.surveyPrimitive as expression}
            {@render expressionButton(expression)}
          {/each}
        </div>
      </div>
    {/if}

    {#if expressions.entryDerived.length}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">Entry Expressions <small>(from expressions)</small></h2>
        {#each expressions.entryDerived as expression}
          {@const expressionNames = expression.input.from == "expressions" ? expression.input.expressionNames : []}
          <div class="flex flex-col gap-3">
            {@render expressionButton(expression)}
            <div class="mb-3 ml-3 flex flex-col gap-2">
              {#each expressionNames as expressionName}
                {@const expression = data.surveyRecord.expressions.find((e) => e.name == expressionName)}
                {#if expression}
                  {@render expressionButton(expression)}
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if expressions.entryTba.length}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">Entry Expressions <small>(from TBA)</small></h2>
        <div class="flex flex-col gap-4">
          {#each expressions.entryTba as expression}
            {@render expressionButton(expression)}
          {/each}
        </div>
      </div>
    {/if}

    {#if expressions.entryPrimitive.length}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">Entry Expressions <small>(from fields)</small></h2>
        <div class="flex flex-col gap-4">
          {#each expressions.entryPrimitive as expression}
            {@render expressionButton(expression)}
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

{#snippet expressionButton(expression: Expression)}
  <Button
    onclick={() => {
      openDialog(ViewExpressionDialog, {
        surveyRecord: data.surveyRecord,
        fields: data.fields,
        entriesByTeam: data.entriesByTeam,
        expression,
      });
    }}
    class={nameWeight(expression.name)}
  >
    {expression.name}
  </Button>
{/snippet}
