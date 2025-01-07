<script lang="ts">
  import type { ExpressionAsExpressionInput } from "$lib/analysis";
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
      .filter((input): input is ExpressionAsExpressionInput => input.from == "expression")
      .map((input) => input.expressionName),
    ...data.surveyRecord.pickLists.flatMap((p) => p.weights).map((w) => w.expressionName),
  ]);
</script>

<Header
  title="Analysis - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Analysis" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-2">
  <h2 class="font-bold">Pick Lists</h2>

  {#if data.surveyRecord.expressions.length}
    {#if $modeStore == "admin"}
      <Button
        onclick={() => {
          openDialog(NewPickListDialog, {
            surveyRecord: data.surveyRecord,
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
            entriesByTeam: data.entriesByTeam,
            pickList,
            index,
            canEdit: true,
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

<div class="flex flex-col gap-2">
  <h2 class="font-bold">Expressions</h2>

  {#if $modeStore == "admin"}
    <div class="flex flex-col gap-2">
      <Button
        onclick={() => {
          openDialog(NewExpressionDialog, {
            surveyRecord: data.surveyRecord,
            fields: data.fields,
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
        New expression
      </Button>
    </div>
  {/if}

  {#each data.surveyRecord.expressions as expression, index}
    <Button
      onclick={() => {
        openDialog(ViewExpressionDialog, {
          surveyRecord: data.surveyRecord,
          fields: data.fields,
          entriesByTeam: data.entriesByTeam,
          expression,
          index,
          usedExpressionNames,
          canEdit: true,
          onupdate(expression) {
            const expressions = structuredClone($state.snapshot(data.surveyRecord.expressions));
            expressions[index] = expression;
            data = {
              ...data,
              surveyRecord: { ...data.surveyRecord, expressions, modified: new Date() },
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
  {/each}
</div>
