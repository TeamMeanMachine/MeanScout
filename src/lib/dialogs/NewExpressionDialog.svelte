<script lang="ts">
  import { SquareCheckBigIcon, SquareIcon, SquarePenIcon } from "@lucide/svelte";
  import { parseValueFromString } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import {
    mapExpressionTypes,
    reduceExpressionTypes,
    type EntryExpression,
    type Expression,
    type SurveyExpression,
  } from "$lib/expression";
  import { type SingleFieldWithDetails } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import EditConvertersDialog from "./EditConvertersDialog.svelte";

  let {
    surveyRecord,
    orderedSingleFields,
    expressions,
    constrain,
    oncreate,
  }: {
    surveyRecord: MatchSurvey;
    orderedSingleFields: SingleFieldWithDetails[];
    expressions: {
      entry: EntryExpression[];
      survey: SurveyExpression[];
    };
    constrain: {
      scope: "entry" | "survey";
    };
    oncreate: (expression: Expression) => void;
  } = $props();

  let { name, scope, input, inputs, method } = $state<Expression>({
    name: "",
    scope: constrain.scope,
    input: { from: "fields", fieldIds: [] },
    inputs: [],
    method: { type: "average" },
  });
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      name = name.trim();

      if (!name) {
        error = "name can't be empty!";
        return;
      }

      if (surveyRecord.expressions.find((e) => e.name == name)) {
        error = "name must be unique!";
        return;
      }

      if (method.type == "divide" && method.divisor == 0) {
        error = "divisor can't be 0!";
        return;
      }

      if (!inputs?.length) {
        error = "no inputs selected!";
        return;
      }

      if (method.type == "convert") {
        method.converters = method.converters.map(({ from, to }) => ({
          from: parseValueFromString(from),
          to,
        }));
      }

      oncreate({ name, scope, input, inputs, method });
      closeDialog();
    },
  };
</script>

<span>New {constrain.scope == "entry" ? "entry" : "aggregate"} expression</span>

<label class="flex flex-col">
  Name
  <input bind:value={name} class="bg-neutral-800 p-2 text-theme" />
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
    class="bg-neutral-800 p-2 text-theme capitalize"
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
    <input bind:value={method.valueToCount} class="bg-neutral-800 p-2 text-theme" />
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
    <SquarePenIcon class="text-theme" />
    Edit Converters
  </Button>
{:else if method.type == "multiply"}
  <label class="flex flex-col">
    Multiplier
    <input type="number" bind:value={method.multiplier} class="bg-neutral-800 p-2 text-theme" />
  </label>
{:else if method.type == "divide"}
  <label class="flex flex-col">
    Divisor
    <input type="number" bind:value={method.divisor} class="bg-neutral-800 p-2 text-theme" />
  </label>
{/if}

{#snippet expressionButton(exp: Expression)}
  {@const isSelected = inputs?.some((i) => i.from == "expression" && i.expressionName == exp.name)}

  <Button
    onclick={() => {
      if (isSelected) {
        inputs = inputs?.filter((i) => !(i.from == "expression" && i.expressionName == exp.name));
      } else {
        inputs?.push({ from: "expression", expressionName: exp.name });
      }
    }}
  >
    {#if isSelected}
      <SquareCheckBigIcon class="text-theme" />
      <span class="text-base font-bold">{exp.name}</span>
    {:else}
      <SquareIcon class="text-theme" />
      {exp.name}
    {/if}
  </Button>
{/snippet}

<div class="flex max-h-[500px] flex-col gap-4 overflow-auto p-1 text-sm">
  {#if constrain.scope == "survey" && expressions.survey.length}
    <div class="flex flex-col gap-2">
      <span>Aggregate Expressions</span>
      {#each expressions.survey as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}

  {#if expressions.entry.length}
    <div class="flex flex-col gap-2">
      <span>Entry Expressions</span>
      {#each expressions.entry as exp}
        {@render expressionButton(exp)}
      {/each}
    </div>
  {/if}

  {#if surveyRecord.tbaMetrics?.length}
    <div class="flex flex-col gap-2">
      <span>TBA Metrics</span>
      {#each surveyRecord.tbaMetrics as tbaMetric}
        {@const isSelected = inputs?.some((i) => i.from == "tba" && i.tbaMetric == tbaMetric)}
        <Button
          onclick={() => {
            if (isSelected) {
              inputs = inputs?.filter((i) => !(i.from == "tba" && i.tbaMetric == tbaMetric));
            } else {
              inputs?.push({ from: "tba", tbaMetric });
            }
          }}
        >
          {#if isSelected}
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

  <div class="flex flex-col gap-2">
    <span>Fields</span>
    {#each orderedSingleFields as field (field.field.id)}
      {@const isSelected = inputs?.some((i) => i.from == "field" && i.fieldId == field.field.id)}

      <Button
        onclick={() => {
          if (isSelected) {
            inputs = inputs?.filter((i) => !(i.from == "field" && i.fieldId == field.field.id));
          } else {
            inputs?.push({ from: "field", fieldId: field.field.id });
          }
        }}
      >
        {#if isSelected}
          <SquareCheckBigIcon class="text-theme" />
          <span class="text-base font-bold">{field.detailedName}</span>
        {:else}
          <SquareIcon class="text-theme" />
          {field.detailedName}
        {/if}
      </Button>
    {/each}
  </div>
</div>

{#if error}
  <span>Error: {error}</span>
{/if}
