<script lang="ts">
  import type { Expression } from "$lib/expression";
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

  let tab = $state<"picklists" | "survey" | "entry">("picklists");

  let expressions = $derived({
    entryDerived: data.surveyRecord.expressions.filter((e) => e.scope == "entry" && e.input.from == "expressions"),
    entryPrimitive: data.surveyRecord.expressions.filter((e) => e.scope == "entry" && e.input.from == "fields"),
    surveyDerived: data.surveyRecord.expressions.filter((e) => e.scope == "survey" && e.input.from == "expressions"),
    surveyPrimitive: data.surveyRecord.expressions.filter((e) => e.scope == "survey" && e.input.from == "fields"),
  });

  function tabClass(matching: string) {
    return tab == matching ? "font-bold" : "font-light";
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
    <div class="flex flex-wrap gap-2 text-sm">
      <Button
        disabled={!data.surveyRecord.pickLists.length}
        onclick={() => (tab = "picklists")}
        class={tabClass("picklists")}
      >
        Pick Lists
      </Button>
      <Button
        disabled={!expressions.surveyDerived.length && !expressions.surveyPrimitive.length}
        onclick={() => (tab = "survey")}
        class={tabClass("survey")}
      >
        Survey
      </Button>
      <Button
        disabled={!expressions.entryDerived.length && !expressions.entryPrimitive.length}
        onclick={() => (tab = "entry")}
        class={tabClass("entry")}
      >
        Entry
      </Button>
    </div>

    {#if tab == "picklists"}
      {#if data.surveyRecord.expressions.length}
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">Pick Lists</h2>
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
        </div>
      {/if}
    {:else if tab == "survey"}
      {#if expressions.surveyPrimitive.length}
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">Survey Expressions <small>(from expressions)</small></h2>
          {#each expressions.surveyDerived as expression}
            {@render expressionButton(expression)}
          {/each}
        </div>
      {/if}

      <div class="flex flex-col gap-2">
        <h2 class="font-bold">Survey Expressions <small>(from fields)</small></h2>
        {#each expressions.surveyPrimitive as expression}
          {@render expressionButton(expression)}
        {/each}
      </div>
    {:else if tab == "entry"}
      {#if expressions.entryDerived.length}
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">Entry Expressions <small>(from expressions)</small></h2>
          {#each expressions.entryDerived as expression}
            {@render expressionButton(expression)}
          {/each}
        </div>
      {/if}

      {#if expressions.entryPrimitive.length}
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">Entry Expressions <small>(from fields)</small></h2>
          {#each expressions.entryPrimitive as expression}
            {@render expressionButton(expression)}
          {/each}
        </div>
      {/if}
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
  >
    {expression.name}
  </Button>
{/snippet}
