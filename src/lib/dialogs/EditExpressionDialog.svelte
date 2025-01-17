<script lang="ts">
  import { parseValueFromString } from "$lib";
  import { mapExpressionTypes, reduceExpressionTypes, type Expression } from "$lib/analysis";
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
      derived: Expression[];
      primitive: Expression[];
    };
    expression: Expression;
    index: number;
    usedExpressionNames?: string[] | undefined;
    onupdate: (expression: Expression) => void;
    ondelete: () => void;
  } = $props();

  let changes = $state(structuredClone($state.snapshot(expression)));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      changes.name = changes.name.trim();

      if (!changes.name) {
        error = "name can't be empty!";
        return;
      }

      if (surveyRecord.expressions.find((e, i) => e.name == changes.name && i != index)) {
        error = "name must be unique!";
        return;
      }

      if (changes.type == "divide" && changes.divisor == 0) {
        error = "divisor can't be 0!";
        return;
      }

      if (changes.from == "fields" && changes.fieldIds.length == 0) {
        error = "no inputs selected!";
        return;
      }

      if (changes.from == "expressions" && changes.expressionNames.length == 0) {
        error = "no inputs selected!";
        return;
      }

      if (changes.type == "convert") {
        changes.converters = changes.converters.map(({ from, to }) => ({
          from: parseValueFromString(from),
          to: parseValueFromString(to),
        }));
        changes.defaultTo = parseValueFromString(changes.defaultTo);
      }

      onupdate(changes);
      closeDialog();
    },
  };
</script>

<span>Edit expression</span>

<label class="flex flex-col">
  Name
  <input bind:value={changes.name} class="bg-neutral-800 p-2 text-theme" />
</label>

<label class="flex flex-col">
  Type
  <select
    value={changes.type}
    onchange={(e) => {
      switch (e.currentTarget.value) {
        case "average":
        case "min":
        case "max":
        case "sum":
          changes = {
            ...(changes.from == "fields"
              ? { from: "fields", fieldIds: changes.fieldIds }
              : { from: "expressions", expressionNames: changes.expressionNames }),
            name: changes.name,
            scope: changes.scope,
            type: e.currentTarget.value,
          };
          break;
        case "count":
          changes = {
            ...(changes.from == "fields"
              ? { from: "fields", fieldIds: changes.fieldIds }
              : { from: "expressions", expressionNames: changes.expressionNames }),
            name: changes.name,
            scope: changes.scope,
            type: e.currentTarget.value,
            valueToCount: "",
          };
          break;
        case "convert":
          changes = {
            ...(changes.from == "fields"
              ? { from: "fields", fieldIds: changes.fieldIds }
              : { from: "expressions", expressionNames: changes.expressionNames }),
            name: changes.name,
            scope: changes.scope,
            type: e.currentTarget.value,
            converters: [],
            defaultTo: "",
          };
          break;
        case "multiply":
          changes = {
            ...(changes.from == "fields"
              ? { from: "fields", fieldIds: changes.fieldIds }
              : { from: "expressions", expressionNames: changes.expressionNames }),
            name: changes.name,
            scope: changes.scope,
            type: e.currentTarget.value,
            multiplier: 1,
          };
          break;
        case "divide":
          changes = {
            ...(changes.from == "fields"
              ? { from: "fields", fieldIds: changes.fieldIds }
              : { from: "expressions", expressionNames: changes.expressionNames }),
            name: changes.name,
            scope: changes.scope,
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

{#if changes.type == "count"}
  <label class="flex flex-col">
    Value to count
    <input bind:value={changes.valueToCount} class="bg-neutral-800 p-2 text-theme" />
  </label>
{:else if changes.type == "convert"}
  <Button
    onclick={() => {
      if (changes.type != "convert") return;
      openDialog(EditConvertersDialog, {
        expression: changes,
        onedit(converters, defaultTo) {
          if (changes.type != "convert") return;
          changes.converters = structuredClone($state.snapshot(converters)).map(({ from, to }) => ({
            from: parseValueFromString(from),
            to: parseValueFromString(to),
          }));
          changes.defaultTo = parseValueFromString(structuredClone($state.snapshot(defaultTo)));
        },
      });
    }}
  >
    <Icon name="pen" />
    Edit Converters
  </Button>
{:else if changes.type == "multiply"}
  <label class="flex flex-col">
    Multiplier
    <input type="number" bind:value={changes.multiplier} class="bg-neutral-800 p-2 text-theme" />
  </label>
{:else if changes.type == "divide"}
  <label class="flex flex-col">
    Divisor
    <input type="number" bind:value={changes.divisor} class="bg-neutral-800 p-2 text-theme" />
  </label>
{/if}

{#if changes.from == "expressions"}
  {#snippet expressionButton(exp: Expression)}
    {@const inputIndex =
      changes.from == "expressions" &&
      changes.expressionNames.findIndex((expressionName) => expressionName == exp.name)}

    <Button
      onclick={() => {
        if (changes.from != "expressions") return;
        if (inputIndex != false && inputIndex != -1) {
          changes.expressionNames = changes.expressionNames.toSpliced(inputIndex, 1);
        } else {
          changes.expressionNames = [...changes.expressionNames, exp.name];
        }
      }}
    >
      {#if inputIndex != false && inputIndex != -1}
        <Icon name="square-check" />
        <strong>{exp.name}</strong>
      {:else}
        <Icon style="regular" name="square" />
        {exp.name}
      {/if}
    </Button>
  {/snippet}

  <div class="flex max-h-[500px] flex-col gap-4 overflow-auto p-1">
    {#if expressions.derived.length}
      <div class="flex flex-col gap-2">
        <span>Expressions <small>(from expressions)</small></span>
        {#each expressions.derived as exp}
          {@render expressionButton(exp)}
        {/each}
      </div>
    {/if}
    {#if expressions.primitive.length}
      <div class="flex flex-col gap-2">
        <span>Expressions <small>(from fields)</small></span>
        {#each expressions.primitive as exp}
          {@render expressionButton(exp)}
        {/each}
      </div>
    {/if}
  </div>
{:else if changes.from == "fields"}
  <span>Fields</span>
  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
    {#each fields as field (field.field.id)}
      {@const inputIndex =
        changes.from == "fields" && changes.fieldIds.findIndex((fieldId) => fieldId == field.field.id)}

      <Button
        onclick={() => {
          if (changes.from != "fields") return;
          if (inputIndex != false && inputIndex != -1) {
            changes.fieldIds = changes.fieldIds.toSpliced(inputIndex, 1);
          } else {
            changes.fieldIds = [...changes.fieldIds, field.field.id];
          }
        }}
      >
        {#if inputIndex != false && inputIndex != -1}
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
