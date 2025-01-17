<script lang="ts">
  import type { Expression } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import EditExpressionDialog from "$lib/dialogs/EditExpressionDialog.svelte";
  import EditPickListDialog from "$lib/dialogs/EditPickListDialog.svelte";
  import NewExpressionDialog from "$lib/dialogs/NewExpressionDialog.svelte";
  import NewPickListDialog from "$lib/dialogs/NewPickListDialog.svelte";
  import { objectStore } from "$lib/idb";
  import AdminHeader from "../AdminHeader.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let usedExpressionNames = $derived([
    ...data.surveyRecord.expressions.filter((e) => e.from == "expressions").flatMap((e) => e.expressionNames),
    ...data.surveyRecord.pickLists.flatMap((p) => p.weights).map((w) => w.expressionName),
  ]);

  let expressions = $derived({
    derived: data.surveyRecord.expressions.filter((expression) => expression.from == "expressions"),
    primitive: data.surveyRecord.expressions.filter((expression) => expression.from == "fields"),
  });

  function expressionReferencesOther(e: Expression, other: Expression) {
    if (e.from == "fields") return false;

    for (const expressionName of e.expressionNames) {
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
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="analysis" />

  {#if data.fields.length > 0}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Pick Lists</h2>

      {#if data.surveyRecord.expressions.length}
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
          <Icon name="plus" />
          New pick list
        </Button>

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
      {:else}
        To set up pick lists, first create some expressions.
      {/if}
    </div>

    {#if expressions.primitive.length > 0}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">Expressions <small>(from expressions)</small></h2>
        <div class="flex flex-col gap-2">
          <Button
            onclick={() => {
              openDialog(NewExpressionDialog, {
                surveyRecord: data.surveyRecord,
                fields: data.fields,
                expressions,
                input: "expressions",
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
            <Icon name="plus" />
            From expressions
          </Button>
        </div>

        {#each expressions.derived as expression}
          {@render expressionButton(expression)}
        {/each}
      </div>
    {/if}

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Expressions <small>(from fields)</small></h2>
      <Button
        onclick={() => {
          openDialog(NewExpressionDialog, {
            surveyRecord: data.surveyRecord,
            fields: data.fields,
            expressions,
            input: "fields",
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
        <Icon name="plus" />
        From fields
      </Button>

      {#each expressions.primitive as expression}
        {@render expressionButton(expression)}
      {/each}
    </div>
  {:else}
    To setup analysis, go create some fields.
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
          derived: expressions.derived.filter(
            (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
          ),
          primitive: expressions.primitive.filter(
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
              if (e.from == "expressions") {
                e.expressionNames = e.expressionNames.map((expressionName) => {
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
