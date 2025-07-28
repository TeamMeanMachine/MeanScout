<script lang="ts">
  import { parseValueFromString } from "$lib";
  import { mapExpressionTypes, reduceExpressionTypes, type Expression } from "$lib/expression";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { SingleFieldWithDetails } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import EditConvertersDialog from "./EditConvertersDialog.svelte";
  import { PenSquareIcon, SquareCheckBigIcon, SquareIcon, Trash2Icon } from "@lucide/svelte";

  let {
    surveyRecord,
    orderedSingleFields,
    expressions,
    expression,
    index,
    usedExpressionNames,
    onupdate,
    ondelete,
  }: {
    surveyRecord: MatchSurvey;
    orderedSingleFields: SingleFieldWithDetails[];
    expressions: {
      entryDerived: Expression[];
      entryTba: Expression[];
      entryPrimitive: Expression[];
      surveyDerived: Expression[];
      surveyTba: Expression[];
      surveyPrimitive: Expression[];
    };
    expression: Expression;
    index: number;
    usedExpressionNames?: string[] | undefined;
    onupdate: (expression: Expression) => void;
    ondelete: () => void;
  } = $props();

  let { name, scope, input, method } = $state(structuredClone($state.snapshot(expression)));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      name = name.trim();

      if (!name) {
        error = "name can't be empty!";
        return;
      }

      if (surveyRecord.expressions.find((e, i) => e.name == name && i != index)) {
        error = "name must be unique!";
        return;
      }

      if (method.type == "divide" && method.divisor == 0) {
        error = "divisor can't be 0!";
        return;
      }

      if (input.from == "fields" && input.fieldIds.length == 0) {
        error = "no inputs selected!";
        return;
      }

      if (input.from == "expressions" && input.expressionNames.length == 0) {
        error = "no inputs selected!";
        return;
      }

      if (method.type == "convert") {
        method.converters = method.converters.map(({ from, to }) => ({
          from: parseValueFromString(from),
          to,
        }));
      }

      onupdate({ name, scope, input, method });
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span class="text-sm">Edit expression</span>

  <Button
    disabled={usedExpressionNames?.includes(expression.name)}
    onclick={() => {
      ondelete();
      closeDialog();
    }}
  >
    <Trash2Icon class="text-theme size-5" />
  </Button>
</div>

<label class="flex flex-col">
  Name
  <!-- svelte-ignore a11y_autofocus -->
  <input bind:value={name} autofocus class="text-theme bg-neutral-800 p-2" />
</label>

<label class="flex flex-col">
  Type
  <select
    value={method.type}
    onchange={(e) => {
      switch (e.currentTarget.value) {
        case "average":
        case "min":
        case "max":
        case "sum":
          method = {
            type: e.currentTarget.value,
          };
          break;
        case "count":
          method = {
            type: e.currentTarget.value,
            valueToCount: "",
          };
          break;
        case "convert":
          method = {
            type: e.currentTarget.value,
            converters: [],
          };
          break;
        case "multiply":
          method = {
            type: e.currentTarget.value,
            multiplier: 1,
          };
          break;
        case "divide":
          method = {
            type: e.currentTarget.value,
            divisor: 1,
          };
          break;
      }
    }}
    class="text-theme bg-neutral-800 p-2 capitalize"
  >
    <optgroup label="Reducers">
      {#each reduceExpressionTypes as expressionType}
        <option>{expressionType}</option>
      {/each}
    </optgroup>
    <optgroup label="Mappers">
      {#each mapExpressionTypes as expressionType}
        <option>{expressionType}</option>
      {/each}
    </optgroup>
  </select>
</label>

{#if method.type == "count"}
  <label class="flex flex-col">
    Value to count
    <input bind:value={method.valueToCount} class="text-theme bg-neutral-800 p-2" />
  </label>
{:else if method.type == "convert"}
  <Button
    onclick={() => {
      if (method.type != "convert") return;
      openDialog(EditConvertersDialog, {
        expressionMethod: method,
        onedit(expressionMethod) {
          method = expressionMethod;
        },
      });
    }}
  >
    <PenSquareIcon class="text-theme" />
    Edit Converters
  </Button>
{:else if method.type == "multiply"}
  <label class="flex flex-col">
    Multiplier
    <input type="number" bind:value={method.multiplier} class="text-theme bg-neutral-800 p-2" />
  </label>
{:else if method.type == "divide"}
  <label class="flex flex-col">
    Divisor
    <input type="number" bind:value={method.divisor} class="text-theme bg-neutral-800 p-2" />
  </label>
{/if}

{#if input.from == "expressions"}
  {#snippet expressionButton(exp: Expression)}
    {@const inputIndex = input.expressionNames.findIndex((expressionName) => expressionName == exp.name)}

    <Button
      onclick={() => {
        if (inputIndex != -1) {
          input.expressionNames = input.expressionNames.toSpliced(inputIndex, 1);
        } else {
          input.expressionNames = [...input.expressionNames, exp.name];
        }
      }}
    >
      {#if inputIndex != -1}
        <SquareCheckBigIcon class="text-theme" />
        <span class="text-base font-bold">{exp.name}</span>
      {:else}
        <SquareIcon class="text-theme" />
        {exp.name}
      {/if}
    </Button>
  {/snippet}

  <div class="flex max-h-[500px] flex-col gap-4 overflow-auto p-1 text-sm">
    {#if scope == "survey"}
      {#if input.from == "expressions" && expressions.surveyDerived.length}
        <div class="flex flex-col gap-2">
          <span>Survey Expressions <span class="text-xs">(from expressions)</span></span>
          {#each expressions.surveyDerived as exp}
            {@render expressionButton(exp)}
          {/each}
        </div>
      {/if}
      {#if expressions.surveyTba.length}
        <div class="flex flex-col gap-2">
          <span>Survey Expressions <span class="text-xs">(from TBA)</span></span>
          {#each expressions.surveyTba as exp}
            {@render expressionButton(exp)}
          {/each}
        </div>
      {/if}
      {#if expressions.surveyPrimitive.length}
        <div class="flex flex-col gap-2">
          <span>Survey Expressions <span class="text-xs">(from fields)</span></span>
          {#each expressions.surveyPrimitive as exp}
            {@render expressionButton(exp)}
          {/each}
        </div>
      {/if}
    {/if}
    {#if (scope == "survey" || input.from == "expressions") && expressions.entryDerived.length}
      <div class="flex flex-col gap-2">
        <span>Entry Expressions <span class="text-xs">(from expressions)</span></span>
        {#each expressions.entryDerived as exp}
          {@render expressionButton(exp)}
        {/each}
      </div>
    {/if}
    {#if expressions.entryTba.length}
      <div class="flex flex-col gap-2">
        <span>Entry Expressions <span class="text-xs">(from TBA)</span></span>
        {#each expressions.entryTba as exp}
          {@render expressionButton(exp)}
        {/each}
      </div>
    {/if}
    {#if expressions.entryPrimitive.length}
      <div class="flex flex-col gap-2">
        <span>Entry Expressions <span class="text-xs">(from fields)</span></span>
        {#each expressions.entryPrimitive as exp}
          {@render expressionButton(exp)}
        {/each}
      </div>
    {/if}
  </div>
{:else if input.from == "fields"}
  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1 text-sm">
    <span>Fields</span>
    {#each orderedSingleFields as field (field.field.id)}
      {@const inputIndex = input.fieldIds.findIndex((fieldId) => fieldId == field.field.id)}

      <Button
        onclick={() => {
          if (inputIndex != -1) {
            input.fieldIds = input.fieldIds.toSpliced(inputIndex, 1);
          } else {
            input.fieldIds = [...input.fieldIds, field.field.id];
          }
        }}
      >
        {#if inputIndex != -1}
          <SquareCheckBigIcon class="text-theme" />
          <span class="text-base font-bold">{field.detailedName}</span>
        {:else}
          <SquareIcon class="text-theme" />
          {field.detailedName}
        {/if}
      </Button>
    {/each}
  </div>
{:else if input.from == "tba" && surveyRecord.tbaMetrics?.length}
  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1 text-sm">
    <span>TBA metrics</span>
    {#each surveyRecord.tbaMetrics as tbaMetric}
      <Button
        onclick={() => {
          if (input.metrics.includes(tbaMetric)) {
            input.metrics = input.metrics.filter((m) => m != tbaMetric);
          } else {
            input.metrics = [...input.metrics, tbaMetric];
          }
        }}
      >
        {#if input.metrics.includes(tbaMetric)}
          <SquareCheckBigIcon class="text-theme" />
          <span class="text-base font-bold">{tbaMetric}</span>
        {:else}
          <SquareIcon class="text-theme" />
          {tbaMetric}
        {/if}
      </Button>
    {/each}
  </div>
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
