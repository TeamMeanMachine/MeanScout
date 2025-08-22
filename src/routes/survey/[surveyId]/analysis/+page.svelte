<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditExpressionDialog from "$lib/dialogs/EditExpressionDialog.svelte";
  import EditPickListDialog from "$lib/dialogs/EditPickListDialog.svelte";
  import NewExpressionDialog from "$lib/dialogs/NewExpressionDialog.svelte";
  import NewPickListDialog from "$lib/dialogs/NewPickListDialog.svelte";
  import { sortExpressions, type Expression } from "$lib/expression";
  import { idb } from "$lib/idb";
  import { PlusIcon } from "@lucide/svelte";
  import SurveyAdminHeader from "../SurveyAdminHeader.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let surveyRecord = $state($state.snapshot(data.surveyRecord));

  const newTab = sessionStorageStore<"entry" | "survey" | "picklist">("admin-analysis-new-tab", "entry");

  const sortedExpressions = $derived(surveyRecord.expressions.toSorted(sortExpressions));

  const usedExpressionNames = $derived([
    ...surveyRecord.expressions.flatMap((e) => (e.input.from == "expressions" ? e.input.expressionNames : [])),
    ...surveyRecord.pickLists.flatMap((p) => p.weights).map((w) => w.expressionName),
  ]);

  const expressions = $derived({
    surveyDerived: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "expressions"),
    surveyTba: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "tba"),
    surveyPrimitive: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "fields"),
    entryDerived: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "expressions"),
    entryTba: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "tba"),
    entryPrimitive: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "fields"),
  });

  function expressionReferencesOther(e: Expression, other: Expression) {
    if (e.input.from != "expressions") return false;

    for (const expressionName of e.input.expressionNames) {
      if (expressionName == other.name) {
        return true;
      }

      const newExp = surveyRecord.expressions.find((newExp) => newExp.name == expressionName);
      if (newExp && expressionReferencesOther(newExp, e)) {
        return true;
      }
    }

    return false;
  }

  function getExpressionsAvailableTo(expression: Expression) {
    return {
      entryDerived: expressions.entryDerived.filter(
        (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
      ),
      entryTba: expressions.entryTba.filter(
        (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
      ),
      entryPrimitive: expressions.entryPrimitive.filter(
        (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
      ),
      surveyDerived: expressions.surveyDerived.filter(
        (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
      ),
      surveyTba: expressions.surveyTba.filter(
        (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
      ),
      surveyPrimitive: expressions.surveyPrimitive.filter(
        (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
      ),
    };
  }

  function tabClass(matching: string) {
    return $newTab == matching ? "font-bold" : "font-light";
  }

  function newExpression(constrain: { scope: "entry" | "survey"; input: "fields" | "tba" | "expressions" }) {
    openDialog(NewExpressionDialog, {
      surveyRecord,
      orderedSingleFields: data.fieldsWithDetails.orderedSingle,
      expressions,
      constrain,
      oncreate(expression) {
        surveyRecord.expressions.push(expression);
        surveyRecord.modified = new Date();
        idb.put("surveys", $state.snapshot(surveyRecord));
      },
    });
  }
</script>

<div class="flex flex-col gap-6" style="view-transition-name:survey-{data.surveyRecord.id}">
  <SurveyAdminHeader compRecord={data.compRecord} surveyRecord={data.surveyRecord} page="analysis" />

  {#if !data.fieldRecords.length}
    <span class="text-sm">To setup analysis, go create some fields.</span>
  {:else}
    {#if surveyRecord.pickLists.length}
      <div class="flex flex-col gap-3">
        <h2 class="font-bold">Pick Lists</h2>
        <div class="flex flex-wrap gap-2">
          {#each surveyRecord.pickLists as pickList, index}
            <Button
              onclick={() => {
                openDialog(EditPickListDialog, {
                  expressions,
                  pickList,
                  onupdate(pickList) {
                    surveyRecord.pickLists[index] = pickList;
                    surveyRecord.modified = new Date();
                    idb.put("surveys", $state.snapshot(surveyRecord));
                  },
                  ondelete() {
                    surveyRecord.pickLists.splice(index, 1);
                    surveyRecord.modified = new Date();
                    idb.put("surveys", $state.snapshot(surveyRecord));
                  },
                });
              }}
              class="text-sm"
            >
              {pickList.name}
            </Button>
          {/each}
        </div>
      </div>
    {/if}

    {#if sortedExpressions.some((e) => e.scope == "survey")}
      <div class="flex flex-col gap-3">
        <h2 class="font-bold">Survey Expressions</h2>

        {#if expressions.surveyDerived.length}
          <div class="flex flex-col">
            <span class="text-xs">From expressions</span>
            <div class="flex flex-wrap gap-2">
              {#each expressions.surveyDerived as expression}
                {@render expressionButton(expression)}
              {/each}
            </div>
          </div>
        {/if}

        {#if expressions.surveyTba.length}
          <div class="flex flex-col">
            <span class="text-xs">From TBA</span>
            <div class="flex flex-wrap gap-2">
              {#each expressions.surveyTba as expression}
                {@render expressionButton(expression)}
              {/each}
            </div>
          </div>
        {/if}

        {#if expressions.surveyPrimitive.length}
          <div class="flex flex-col">
            <span class="text-xs">From fields</span>
            <div class="flex flex-wrap gap-2">
              {#each expressions.surveyPrimitive as expression}
                {@render expressionButton(expression)}
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#if sortedExpressions.some((e) => e.scope == "entry")}
      <div class="flex flex-col gap-3">
        <h2 class="font-bold">Entry Expressions</h2>

        {#if expressions.entryDerived.length}
          <div class="flex flex-col">
            <span class="text-xs">From expressions</span>
            <div class="flex flex-wrap gap-2">
              {#each expressions.entryDerived as expression}
                {@render expressionButton(expression)}
              {/each}
            </div>
          </div>
        {/if}

        {#if expressions.entryTba.length}
          <div class="flex flex-col">
            <span class="text-xs">From TBA</span>
            <div class="flex flex-wrap gap-2">
              {#each expressions.entryTba as expression}
                {@render expressionButton(expression)}
              {/each}
            </div>
          </div>
        {/if}

        {#if expressions.entryPrimitive.length}
          <div class="flex flex-col">
            <span class="text-xs">From fields</span>
            <div class="flex flex-wrap gap-2">
              {#each expressions.entryPrimitive as expression}
                {@render expressionButton(expression)}
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div
      class="sticky bottom-3 z-20 flex w-80 max-w-full flex-col gap-2 self-start border border-neutral-500 bg-neutral-900 p-2 text-xs shadow-2xl"
    >
      <div class="flex flex-wrap justify-stretch gap-2">
        <Button onclick={() => ($newTab = "entry")} class={tabClass("entry")}>Entry</Button>
        <Button onclick={() => ($newTab = "survey")} class={tabClass("survey")}>Survey</Button>
        <Button onclick={() => ($newTab = "picklist")} class={tabClass("picklist")}>Pick List</Button>
      </div>

      <div class="flex flex-col">
        {#if $newTab == "entry"}
          <span>Entry Expression</span>

          <div class="flex flex-wrap gap-2">
            <Button onclick={() => newExpression({ scope: "entry", input: "fields" })}>
              <PlusIcon class="text-theme size-5" />
              Fields
            </Button>
            <Button
              onclick={() => newExpression({ scope: "entry", input: "tba" })}
              disabled={!surveyRecord.tbaMetrics?.length}
              class="text-xs"
            >
              <PlusIcon class="text-theme size-5" />
              TBA
            </Button>
            <Button
              onclick={() => newExpression({ scope: "entry", input: "expressions" })}
              disabled={!sortedExpressions.some((e) => e.scope == "entry")}
            >
              <PlusIcon class="text-theme size-5" />
              Expressions
            </Button>
          </div>
        {:else if $newTab == "survey"}
          <span>Survey Expression</span>

          <div class="flex flex-wrap gap-2">
            <Button onclick={() => newExpression({ scope: "survey", input: "fields" })}>
              <PlusIcon class="text-theme size-5" />
              Fields
            </Button>
            <Button
              onclick={() => newExpression({ scope: "survey", input: "tba" })}
              disabled={!surveyRecord.tbaMetrics?.length}
            >
              <PlusIcon class="text-theme size-5" />
              TBA
            </Button>
            <Button
              onclick={() => newExpression({ scope: "survey", input: "expressions" })}
              disabled={!sortedExpressions.length}
            >
              <PlusIcon class="text-theme size-5" />
              Expressions
            </Button>
          </div>
        {:else if $newTab == "picklist"}
          <span>New</span>

          <div class="flex flex-wrap gap-2">
            <Button
              onclick={() => {
                openDialog(NewPickListDialog, {
                  expressions,
                  oncreate(pickList) {
                    surveyRecord.pickLists.push(pickList);
                    surveyRecord.modified = new Date();
                    idb.put("surveys", $state.snapshot(surveyRecord));
                  },
                });
              }}
              disabled={!sortedExpressions.length}
            >
              <PlusIcon class="text-theme size-5" />
              Pick list
            </Button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#snippet expressionButton(expression: Expression)}
  {@const index = surveyRecord.expressions.findIndex((e) => e.name == expression.name)}

  <Button
    onclick={() => {
      openDialog(EditExpressionDialog, {
        surveyRecord,
        orderedSingleFields: data.fieldsWithDetails.orderedSingle,
        expressions: getExpressionsAvailableTo(expression),
        expression,
        index,
        usedExpressionNames,
        onupdate(expression) {
          let pickLists = structuredClone($state.snapshot(surveyRecord.pickLists));
          let expressions = structuredClone($state.snapshot(surveyRecord.expressions));

          const previousName = expressions[index].name;
          if (expression.name != previousName) {
            pickLists = pickLists.map((pickList) => {
              pickList.weights = pickList.weights.map((weight) => {
                if (weight.expressionName == previousName) {
                  weight.expressionName = expression.name;
                }
                return weight;
              });
              return pickList;
            });

            expressions = expressions.map((e) => {
              if (e.input.from == "expressions") {
                e.input.expressionNames = e.input.expressionNames.map((expressionName) => {
                  if (expressionName == previousName) {
                    return expression.name;
                  }
                  return expressionName;
                });
              }
              return e;
            });
          }

          expressions[index] = expression;
          surveyRecord.pickLists = pickLists;
          surveyRecord.expressions = expressions;
          surveyRecord.modified = new Date();
          idb.put("surveys", $state.snapshot(surveyRecord));
        },
        ondelete() {
          surveyRecord.expressions.splice(index, 1);
          surveyRecord.modified = new Date();
          idb.put("surveys", $state.snapshot(surveyRecord));
        },
      });
    }}
    class="text-sm"
  >
    {expression.name}
  </Button>
{/snippet}
