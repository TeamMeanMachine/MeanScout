<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditExpressionDialog from "$lib/dialogs/EditExpressionDialog.svelte";
  import EditPickListDialog from "$lib/dialogs/EditPickListDialog.svelte";
  import NewExpressionDialog from "$lib/dialogs/NewExpressionDialog.svelte";
  import NewPickListDialog from "$lib/dialogs/NewPickListDialog.svelte";
  import { sortExpressions, type Expression } from "$lib/expression";
  import { idb } from "$lib/idb";
  import { PlusIcon } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import { invalidateAll } from "$app/navigation";

  let { data }: PageProps = $props();

  let surveyRecord = $state($state.snapshot(data.surveyRecord));

  const sortedExpressions = $derived(surveyRecord.expressions.toSorted(sortExpressions));

  const usedExpressionNames = $derived([
    ...surveyRecord.expressions.flatMap((e) => (e.input.from == "expressions" ? e.input.expressionNames : [])),
    ...surveyRecord.pickLists.flatMap((p) => p.weights).map((w) => w.expressionName),
  ]);

  const expressions = $derived({
    survey: sortedExpressions.filter((e) => e.scope == "survey"),
    entry: sortedExpressions.filter((e) => e.scope == "entry"),
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
      entry: expressions.entry.filter((e) => expression.name != e.name && !expressionReferencesOther(e, expression)),
      survey: expressions.survey.filter((e) => expression.name != e.name && !expressionReferencesOther(e, expression)),
    };
  }

  function newExpression(constrain: { scope: "entry" | "survey" }) {
    openDialog(NewExpressionDialog, {
      surveyRecord,
      orderedSingleFields: data.fieldsWithDetails.orderedSingle,
      expressions,
      constrain,
      oncreate(expression) {
        surveyRecord.expressions.push(expression);
        surveyRecord.modified = new Date();
        idb.put("surveys", $state.snapshot(surveyRecord)).onsuccess = invalidateAll;
      },
    });
  }
</script>

<div class="flex flex-col gap-6">
  {#if !data.fieldRecords.length}
    <span class="text-sm">To setup rankings, go create some fields.</span>
  {:else}
    {#if surveyRecord.pickLists.length}
      <div class="flex flex-col gap-3">
        <h2 class="font-bold">Pick Lists</h2>
        <div class="flex flex-wrap gap-2">
          {#each surveyRecord.pickLists as pickList, index}
            <Button
              onclick={() => {
                openDialog(EditPickListDialog, {
                  surveyRecord,
                  expressions,
                  pickList,
                  index,
                  onupdate(pickList) {
                    surveyRecord.pickLists[index] = pickList;
                    surveyRecord.modified = new Date();
                    idb.put("surveys", $state.snapshot(surveyRecord)).onsuccess = invalidateAll;
                  },
                  onreset() {
                    delete surveyRecord.pickLists[index].customRanks;
                    delete surveyRecord.pickLists[index].omittedTeams;
                    surveyRecord.modified = new Date();
                    idb.put("surveys", $state.snapshot(surveyRecord)).onsuccess = invalidateAll;
                  },
                  ondelete() {
                    surveyRecord.pickLists.splice(index, 1);
                    surveyRecord.modified = new Date();
                    idb.put("surveys", $state.snapshot(surveyRecord)).onsuccess = invalidateAll;
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

    {#if expressions.survey.length}
      <div class="flex flex-col gap-3">
        <h2 class="font-bold">Aggregate Expressions</h2>
        <div class="flex flex-wrap gap-2">
          {#each expressions.survey as expression}
            {@render expressionButton(expression)}
          {/each}
        </div>
      </div>
    {/if}

    {#if expressions.survey.length}
      <div class="flex flex-col gap-3">
        <h2 class="font-bold">Entry Expressions</h2>
        <div class="flex flex-wrap gap-2">
          {#each expressions.entry as expression}
            {@render expressionButton(expression)}
          {/each}
        </div>
      </div>
    {/if}

    <div
      class="sticky bottom-3 z-20 flex max-w-full flex-col gap-2 self-start border border-neutral-500 bg-neutral-900 p-2 text-xs shadow-2xl"
    >
      <Button
        onclick={() => {
          newExpression({
            scope: "entry",
          });
        }}
      >
        <PlusIcon class="text-theme size-5" />
        Entry Expression
      </Button>

      <Button
        onclick={() => {
          newExpression({
            scope: "survey",
          });
        }}
      >
        <PlusIcon class="text-theme size-5" />
        Aggregate Expression
      </Button>

      <Button
        onclick={() => {
          openDialog(NewPickListDialog, {
            surveyRecord: data.surveyRecord,
            expressions,
            oncreate(pickList) {
              surveyRecord.pickLists.push(pickList);
              surveyRecord.modified = new Date();
              idb.put("surveys", $state.snapshot(surveyRecord)).onsuccess = invalidateAll;
            },
          });
        }}
        disabled={!sortedExpressions.length}
      >
        <PlusIcon class="text-theme size-5" />
        Pick List
      </Button>
    </div>

    <div class="flex flex-col gap-2 text-sm font-light">
      <span>
        Entry expressions act like derived/computed fields, e.g. getting a team's point contribution every match.
      </span>
      <span>Aggregate expressions combine data across matches, e.g. getting a team's highest point contribution.</span>
      <span>Pick lists couple selected expressions with percentage weights.</span>
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
          idb.put("surveys", $state.snapshot(surveyRecord)).onsuccess = invalidateAll;
        },
        ondelete() {
          surveyRecord.expressions.splice(index, 1);
          surveyRecord.modified = new Date();
          idb.put("surveys", $state.snapshot(surveyRecord)).onsuccess = invalidateAll;
        },
      });
    }}
    class="text-sm"
  >
    {expression.name}
  </Button>
{/snippet}
