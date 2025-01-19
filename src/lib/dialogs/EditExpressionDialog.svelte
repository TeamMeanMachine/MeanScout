<script lang="ts">
  import { parseValueFromString } from "$lib";
  import { mapExpressionTypes, reduceExpressionTypes, type Expression } from "$lib/expression";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { DetailedSingleField } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import EditConvertersDialog from "./EditConvertersDialog.svelte";

  let {
    surveyRecord,
    fields,
    expressions,
    expression,
    index,
    usedExpressionNames,
    onupdate,
    ondelete,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fields: DetailedSingleField[];
    expressions: {
      entryDerived: Expression[];
      entryPrimitive: Expression[];
      surveyDerived: Expression[];
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
          to: parseValueFromString(to),
        }));
        method.defaultTo = parseValueFromString(method.defaultTo);
      }

      onupdate({ name, scope, input, method });
      closeDialog();
    },
  };

  function getSwitchScopeButtonData(): { can: boolean; reason?: string } {
    if (surveyRecord.pickLists.some((pl) => pl.weights.some((w) => w.expressionName == expression.name))) {
      return { can: false, reason: "Used by picklist" };
    }

    if (
      scope == "entry" &&
      surveyRecord.expressions.some(
        (e) =>
          e.name != expression.name &&
          e.scope == "entry" &&
          e.input.from == "expressions" &&
          e.input.expressionNames.includes(expression.name),
      )
    ) {
      return { can: false, reason: "Used by entry expression" };
    }

    if (scope == "survey" && input.from == "expressions") {
      if (
        input.expressionNames.some((name) =>
          surveyRecord.expressions.some((e) => e.scope == "survey" && e.name == name),
        )
      ) {
        return { can: false, reason: "Uses survey expression" };
      }

      if (
        surveyRecord.expressions.some(
          (e) =>
            e.name != expression.name &&
            e.scope == "survey" &&
            e.input.from == "expressions" &&
            e.input.expressionNames.includes(expression.name),
        )
      ) {
        return { can: false, reason: "Used by survey expression" };
      }
    }

    return { can: true };
  }

  let switchScopeButtonData = getSwitchScopeButtonData();
</script>

<span>Edit expression</span>

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
            defaultTo: "",
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
    class="bg-neutral-800 p-2 capitalize text-theme"
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
    <Icon name="pen" />
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
        <Icon name="square-check" />
        <strong>{exp.name}</strong>
      {:else}
        <Icon style="regular" name="square" />
        {exp.name}
      {/if}
    </Button>
  {/snippet}

  <div class="flex max-h-[500px] flex-col gap-4 overflow-auto p-1">
    {#if scope == "survey"}
      {#if input.from == "expressions" && expressions.surveyDerived.length}
        <div class="flex flex-col gap-2">
          <span class="text-sm">Survey Expressions (from expressions)</span>
          {#each expressions.surveyDerived as exp}
            {@render expressionButton(exp)}
          {/each}
        </div>
      {/if}
      {#if expressions.surveyPrimitive.length}
        <div class="flex flex-col gap-2">
          <span class="text-sm">Survey Expressions (from fields)</span>
          {#each expressions.surveyPrimitive as exp}
            {@render expressionButton(exp)}
          {/each}
        </div>
      {/if}
    {/if}
    {#if (scope == "survey" || input.from == "expressions") && expressions.entryDerived.length}
      <div class="flex flex-col gap-2">
        <span class="text-sm">Entry Expressions (from expressions)</span>
        {#each expressions.entryDerived as exp}
          {@render expressionButton(exp)}
        {/each}
      </div>
    {/if}
    {#if expressions.entryPrimitive.length}
      <div class="flex flex-col gap-2">
        <span class="text-sm">Entry Expressions (from fields)</span>
        {#each expressions.entryPrimitive as exp}
          {@render expressionButton(exp)}
        {/each}
      </div>
    {/if}
  </div>
{:else if input.from == "fields"}
  <span>Fields</span>
  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
    {#each fields as field (field.field.id)}
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
          <Icon name="square-check" />
          <strong>{field.detailedName}</strong>
        {:else}
          <Icon style="regular" name="square" />
          {field.detailedName}
        {/if}
      </Button>
    {/each}
  </div>
{/if}

<Button
  type="submit"
  disabled={!switchScopeButtonData.can}
  onclick={(e) => {
    e.preventDefault();
    scope = scope == "entry" ? "survey" : "entry";
    onupdate({ ...expression, scope });
    closeDialog();
  }}
>
  <Icon name={scope == "entry" ? "expand" : "compress"} />
  <div class="flex flex-col">
    Switch to {scope == "entry" ? "survey" : "entry"} expression
    {#if switchScopeButtonData.reason}
      <small>{switchScopeButtonData.reason}</small>
    {/if}
  </div>
</Button>

{#if !usedExpressionNames?.includes(expression.name)}
  <Button
    onclick={() => {
      ondelete();
      closeDialog();
    }}
  >
    <Icon name="trash" />
    Delete
  </Button>
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
