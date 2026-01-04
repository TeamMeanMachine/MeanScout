<script lang="ts">
  import { SquareCheckBigIcon, SquareIcon, SquarePenIcon, Trash2Icon } from "@lucide/svelte";
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
  import type { SingleFieldWithDetails } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import DeleteExpressionDialog from "./DeleteExpressionDialog.svelte";
  import EditConvertersDialog from "./EditConvertersDialog.svelte";

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
      entry: EntryExpression[];
      survey: SurveyExpression[];
    };
    expression: Expression;
    index: number;
    usedExpressionNames?: string[] | undefined;
    onupdate: (expression: Expression) => void;
    ondelete: () => void;
  } = $props();

  let { name, scope, input, inputs, method } = $state(structuredClone($state.snapshot(expression)));
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

      if (input.from == "fields" && input.fieldIds.length == 0 && !inputs?.length) {
        error = "no inputs selected!";
        return;
      }

      if (input.from == "tba" && input.metrics.length == 0 && !inputs?.length) {
        error = "no inputs selected!";
        return;
      }

      if (input.from == "expressions" && input.expressionNames.length == 0 && !inputs?.length) {
        error = "no inputs selected!";
        return;
      }

      if (method.type == "convert") {
        method.converters = method.converters.map(({ from, to }) => ({
          from: parseValueFromString(from),
          to,
        }));
      }

      onupdate({ name, scope, input, inputs, method });
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span class="text-sm">Edit {expression.scope == "entry" ? "entry" : "aggregate"} expression</span>

  <Button
    disabled={usedExpressionNames?.includes(expression.name)}
    onclick={() => {
      openDialog(DeleteExpressionDialog, {
        ondelete() {
          ondelete();
          closeDialog();
        },
      });
    }}
  >
    <Trash2Icon class="size-5 text-theme" />
  </Button>
</div>

<label class="flex flex-col">
  Name
  <!-- svelte-ignore a11y_autofocus -->
  <input bind:value={name} autofocus class="bg-neutral-800 p-2 text-theme" />
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
  {@const isLegacySelected =
    input.from == "expressions" ? input.expressionNames.some((name) => name == exp.name) : false}
  {@const isSelected = isLegacySelected || inputs?.some((i) => i.from == "expression" && i.expressionName == exp.name)}

  <Button
    onclick={() => {
      if (input.from == "expressions") {
        input.expressionNames = input.expressionNames.filter((name) => name != exp.name);
      }

      if (isSelected) {
        inputs = inputs?.filter((i) => !(i.from == "expression" && i.expressionName == exp.name));
      } else {
        inputs = [...(inputs || []), { from: "expression", expressionName: exp.name }];
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
  {#if scope == "survey" && expressions.survey.length}
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
      <span>TBA metrics</span>

      {#each surveyRecord.tbaMetrics as tbaMetric}
        {@const isLegacySelected = input.from == "tba" ? input.metrics.some((metric) => metric == tbaMetric) : false}
        {@const isSelected = isLegacySelected || inputs?.some((i) => i.from == "tba" && i.tbaMetric == tbaMetric)}

        <Button
          onclick={() => {
            if (input.from == "tba") {
              input.metrics = input.metrics.filter((m) => m != tbaMetric);
            }

            if (isSelected) {
              inputs = inputs?.filter((i) => !(i.from == "tba" && i.tbaMetric == tbaMetric));
            } else {
              inputs = [...(inputs || []), { from: "tba", tbaMetric }];
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
      {@const isLegacySelected = input.from == "fields" ? input.fieldIds.some((id) => id == field.field.id) : false}
      {@const isSelected = isLegacySelected || inputs?.some((i) => i.from == "field" && i.fieldId == field.field.id)}

      <Button
        onclick={() => {
          if (input.from == "fields") {
            input.fieldIds = input.fieldIds.filter((id) => id != field.field.id);
          }

          if (isSelected) {
            inputs = inputs?.filter((i) => !(i.from == "field" && i.fieldId == field.field.id));
          } else {
            inputs = [...(inputs || []), { from: "field", fieldId: field.field.id }];
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
