<script lang="ts">
  import type { Expression } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import ViewExpressionDialog from "$lib/dialogs/ViewExpressionDialog.svelte";
  import ViewPickListDialog from "$lib/dialogs/ViewPickListDialog.svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

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

<div class="flex flex-col gap-6" style="view-transition-name:analysis">
  {#if data.fields.length > 0}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Pick Lists</h2>

      {#if data.surveyRecord.expressions.length}
        {#each data.surveyRecord.pickLists as pickList}
          <Button
            onclick={() => {
              openDialog(ViewPickListDialog, {
                surveyRecord: data.surveyRecord,
                fields: data.fields,
                entriesByTeam: data.entriesByTeam,
                pickList,
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
        {#each expressions.derived as expression}
          {@render expressionButton(expression)}
        {/each}
      </div>
    {/if}

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Expressions <small>(from fields)</small></h2>
      {#each expressions.primitive as expression}
        {@render expressionButton(expression)}
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
    No fields.
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
  >
    {expression.name}
  </Button>
{/snippet}
