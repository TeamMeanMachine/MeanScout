<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditExpressionDialog from "$lib/dialogs/EditExpressionDialog.svelte";
  import EditPickListDialog from "$lib/dialogs/EditPickListDialog.svelte";
  import NewExpressionDialog from "$lib/dialogs/NewExpressionDialog.svelte";
  import NewPickListDialog from "$lib/dialogs/NewPickListDialog.svelte";
  import type { Expression } from "$lib/expression";
  import { objectStore } from "$lib/idb";
  import { PlusIcon } from "@lucide/svelte";
  import AdminHeader from "../AdminHeader.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const tab = sessionStorageStore<"entry" | "survey" | "picklists">("analysis-tab", "entry");

  let usedExpressionNames = $derived([
    ...data.surveyRecord.expressions.flatMap((e) => (e.input.from == "expressions" ? e.input.expressionNames : [])),
    ...data.surveyRecord.pickLists.flatMap((p) => p.weights).map((w) => w.expressionName),
  ]);

  let expressions = $derived({
    entryDerived: data.surveyRecord.expressions.filter((e) => e.scope == "entry" && e.input.from == "expressions"),
    entryTba: data.surveyRecord.expressions.filter((e) => e.scope == "entry" && e.input.from == "tba"),
    entryPrimitive: data.surveyRecord.expressions.filter((e) => e.scope == "entry" && e.input.from == "fields"),
    surveyDerived: data.surveyRecord.expressions.filter((e) => e.scope == "survey" && e.input.from == "expressions"),
    surveyTba: data.surveyRecord.expressions.filter((e) => e.scope == "survey" && e.input.from == "tba"),
    surveyPrimitive: data.surveyRecord.expressions.filter((e) => e.scope == "survey" && e.input.from == "fields"),
  });

  function expressionReferencesOther(e: Expression, other: Expression) {
    if (e.input.from != "expressions") return false;

    for (const expressionName of e.input.expressionNames) {
      if (expressionName == other.name) {
        return true;
      }

      const newExp = data.surveyRecord.expressions.find((newExp) => newExp.name == expressionName);
      if (newExp && expressionReferencesOther(newExp, e)) {
        return true;
      }
    }

    return false;
  }

  function tabClass(matching: string) {
    return $tab == matching ? "font-bold" : "font-light";
  }
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="analysis" />

  {#if data.fields.length == 0}
    <span>To setup analysis, go create some fields.</span>
  {:else}
    <div class="flex flex-wrap gap-2 text-sm">
      <Button onclick={() => ($tab = "entry")} class={tabClass("entry")}>Entry</Button>
      <Button onclick={() => ($tab = "survey")} class={tabClass("survey")}>Survey</Button>
      <Button
        disabled={!expressions.surveyDerived.length && !expressions.surveyPrimitive.length}
        onclick={() => ($tab = "picklists")}
        class={tabClass("picklists")}
      >
        Pick Lists
      </Button>
    </div>

    {#if $tab == "entry"}
      {#if expressions.entryPrimitive.length > 0}
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-2">
            <h2 class="font-bold">Entry Expressions <small>(from expressions)</small></h2>
            <Button
              onclick={() => {
                openDialog(NewExpressionDialog, {
                  surveyRecord: data.surveyRecord,
                  fields: data.fields,
                  expressions,
                  constrain: {
                    scope: "entry",
                    input: "expressions",
                  },
                  oncreate(expression) {
                    data = {
                      ...data,
                      surveyRecord: {
                        ...data.surveyRecord,
                        expressions: [...data.surveyRecord.expressions, expression],
                        modified: new Date(),
                      },
                    };
                    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                  },
                });
              }}
            >
              <PlusIcon class="text-theme" />
              From expressions
            </Button>
          </div>

          {#if expressions.entryDerived.length}
            <div class="flex flex-col gap-2">
              {#each expressions.entryDerived as expression}
                {@render expressionButton(expression)}
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if data.surveyRecord.tbaMetrics?.length}
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-2">
            <h2 class="font-bold">Entry Expressions <small>(from TBA)</small></h2>
            <Button
              onclick={() => {
                openDialog(NewExpressionDialog, {
                  surveyRecord: data.surveyRecord,
                  fields: data.fields,
                  expressions,
                  constrain: {
                    scope: "entry",
                    input: "tba",
                  },
                  oncreate(expression) {
                    data = {
                      ...data,
                      surveyRecord: {
                        ...data.surveyRecord,
                        expressions: [...data.surveyRecord.expressions, expression],
                        modified: new Date(),
                      },
                    };
                    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                  },
                });
              }}
            >
              <PlusIcon class="text-theme" />
              From TBA
            </Button>
          </div>

          {#if expressions.entryTba.length}
            <div class="flex flex-col gap-2">
              {#each expressions.entryTba as expression}
                {@render expressionButton(expression)}
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">Entry Expressions <small>(from fields)</small></h2>
          <Button
            onclick={() => {
              openDialog(NewExpressionDialog, {
                surveyRecord: data.surveyRecord,
                fields: data.fields,
                expressions,
                constrain: {
                  scope: "entry",
                  input: "fields",
                },
                oncreate(expression) {
                  data = {
                    ...data,
                    surveyRecord: {
                      ...data.surveyRecord,
                      expressions: [...data.surveyRecord.expressions, expression],
                      modified: new Date(),
                    },
                  };
                  objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                },
              });
            }}
          >
            <PlusIcon class="text-theme" />
            From fields
          </Button>
        </div>

        {#if expressions.entryPrimitive.length}
          <div class="flex flex-col gap-2">
            {#each expressions.entryPrimitive as expression}
              {@render expressionButton(expression)}
            {/each}
          </div>
        {/if}
      </div>
    {:else if $tab == "survey"}
      {#if expressions.surveyPrimitive.length || expressions.entryDerived.length || expressions.entryPrimitive.length}
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-2">
            <h2 class="font-bold">Survey Expressions <small>(from expressions)</small></h2>
            <Button
              onclick={() => {
                openDialog(NewExpressionDialog, {
                  surveyRecord: data.surveyRecord,
                  fields: data.fields,
                  expressions,
                  constrain: {
                    scope: "survey",
                    input: "expressions",
                  },
                  oncreate(expression) {
                    data = {
                      ...data,
                      surveyRecord: {
                        ...data.surveyRecord,
                        expressions: [...data.surveyRecord.expressions, expression],
                        modified: new Date(),
                      },
                    };
                    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                  },
                });
              }}
            >
              <PlusIcon class="text-theme" />
              From expressions
            </Button>
          </div>

          {#if expressions.surveyDerived.length}
            <div class="flex flex-col gap-2">
              {#each expressions.surveyDerived as expression}
                {@render expressionButton(expression)}
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">Survey Expressions <small>(from fields)</small></h2>
          <Button
            onclick={() => {
              openDialog(NewExpressionDialog, {
                surveyRecord: data.surveyRecord,
                fields: data.fields,
                expressions,
                constrain: {
                  scope: "survey",
                  input: "fields",
                },
                oncreate(expression) {
                  data = {
                    ...data,
                    surveyRecord: {
                      ...data.surveyRecord,
                      expressions: [...data.surveyRecord.expressions, expression],
                      modified: new Date(),
                    },
                  };
                  objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                },
              });
            }}
          >
            <PlusIcon class="text-theme" />
            From fields
          </Button>
        </div>

        {#if expressions.surveyPrimitive.length}
          <div class="flex flex-col gap-2">
            {#each expressions.surveyPrimitive as expression}
              {@render expressionButton(expression)}
            {/each}
          </div>
        {/if}
      </div>
    {:else if $tab == "picklists"}
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">Pick Lists</h2>

          <Button
            onclick={() => {
              openDialog(NewPickListDialog, {
                expressions,
                oncreate(pickList) {
                  data = {
                    ...data,
                    surveyRecord: {
                      ...data.surveyRecord,
                      pickLists: [...data.surveyRecord.pickLists, pickList],
                      modified: new Date(),
                    },
                  };
                  objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                },
              });
            }}
          >
            <PlusIcon class="text-theme" />
            New pick list
          </Button>
        </div>

        {#if data.surveyRecord.pickLists.length}
          <div class="flex flex-col gap-2">
            {#each data.surveyRecord.pickLists as pickList, index}
              <Button
                onclick={() => {
                  openDialog(EditPickListDialog, {
                    expressions,
                    pickList,
                    onupdate(pickList) {
                      const pickLists = structuredClone($state.snapshot(data.surveyRecord.pickLists));
                      pickLists[index] = pickList;
                      data = {
                        ...data,
                        surveyRecord: { ...data.surveyRecord, pickLists, modified: new Date() },
                      };
                      objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                    },
                    ondelete() {
                      data = {
                        ...data,
                        surveyRecord: {
                          ...data.surveyRecord,
                          pickLists: data.surveyRecord.pickLists.toSpliced(index, 1),
                          modified: new Date(),
                        },
                      };
                      objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                    },
                  });
                }}
              >
                {pickList.name}
              </Button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

{#snippet expressionButton(expression: Expression)}
  {@const index = data.surveyRecord.expressions.findIndex((e) => e.name == expression.name)}

  <Button
    onclick={() => {
      openDialog(EditExpressionDialog, {
        surveyRecord: data.surveyRecord,
        fields: data.fields,
        expressions: {
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
        },
        expression,
        index,
        usedExpressionNames,
        onupdate(expression) {
          let pickLists = structuredClone($state.snapshot(data.surveyRecord.pickLists));
          let expressions = structuredClone($state.snapshot(data.surveyRecord.expressions));

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
          data = {
            ...data,
            surveyRecord: { ...data.surveyRecord, pickLists, expressions, modified: new Date() },
          };
          objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
        },
        ondelete() {
          data = {
            ...data,
            surveyRecord: {
              ...data.surveyRecord,
              expressions: data.surveyRecord.expressions.toSpliced(index, 1),
              modified: new Date(),
            },
          };
          objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
        },
      });
    }}
  >
    {expression.name}
  </Button>
{/snippet}
