<script lang="ts">
  import type { Expression } from "$lib/analysis";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import NewExpressionDialog from "$lib/dialogs/NewExpressionDialog.svelte";
  import NewPickListDialog from "$lib/dialogs/NewPickListDialog.svelte";
  import ViewExpressionDialog from "$lib/dialogs/ViewExpressionDialog.svelte";
  import ViewPickListDialog from "$lib/dialogs/ViewPickListDialog.svelte";
  import { objectStore } from "$lib/idb";
  import { modeStore } from "$lib/settings";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let usedExpressionNames = $derived([
    ...data.surveyRecord.expressions
      .flatMap((e) => e.inputs)
      .filter((input) => input.from == "expression")
      .map((input) => input.expressionName),
    ...data.surveyRecord.pickLists.flatMap((p) => p.weights).map((w) => w.expressionName),
  ]);

  let expressions = $derived({
    derived: data.surveyRecord.expressions.filter(
      (expression) => expression.inputs.length && expression.inputs.every((input) => input.from == "expression"),
    ),
    primitive: data.surveyRecord.expressions.filter(
      (expression) => expression.inputs.length && expression.inputs.every((input) => input.from == "field"),
    ),
    mixed: data.surveyRecord.expressions.filter(
      (expression) =>
        !expression.inputs.length ||
        (expression.inputs.some((input) => input.from == "expression") &&
          expression.inputs.some((input) => input.from == "field")),
    ),
  });
</script>

<Header
  title="Analysis - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Analysis" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

{#if data.fields.length > 0}
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Pick Lists</h2>

    {#if data.surveyRecord.expressions.length}
      {#if $modeStore == "admin"}
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
      {/if}

      {#each data.surveyRecord.pickLists as pickList, index}
        <Button
          onclick={() => {
            openDialog(ViewPickListDialog, {
              surveyRecord: data.surveyRecord,
              fields: data.fields,
              expressions,
              entriesByTeam: data.entriesByTeam,
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
      {#if $modeStore == "admin"}
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
      {/if}

      {#each expressions.derived as expression}
        {@render expressionButton(expression, "expressions")}
      {/each}
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Expressions <small>(from fields)</small></h2>
    {#if $modeStore == "admin"}
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
    {/if}

    {#each expressions.primitive as expression}
      {@render expressionButton(expression, "fields")}
    {/each}
  </div>

  {#if expressions.mixed.length}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Expressions <small>(mixed)</small></h2>
      {#each expressions.mixed as expression}
        {@render expressionButton(expression)}
      {/each}
    </div>
  {/if}
{:else}
  To setup analysis, go create some fields.
  <Anchor route="survey/{data.surveyRecord.id}/fields" class="self-start">
    <Icon name="list-check" />
    Fields
  </Anchor>
{/if}

{#snippet expressionButton(expression: Expression, input?: "expressions" | "fields")}
  {@const index = data.surveyRecord.expressions.findIndex((e) => e.name == expression.name)}

  <Button
    onclick={() => {
      openDialog(ViewExpressionDialog, {
        surveyRecord: data.surveyRecord,
        fields: data.fields,
        expressions,
        entriesByTeam: data.entriesByTeam,
        expression,
        index,
        input,
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
              e.inputs = e.inputs.map((input) => {
                if (input.from == "expression" && input.expressionName == previousName) {
                  input.expressionName = expression.name;
                }
                return input;
              });
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
