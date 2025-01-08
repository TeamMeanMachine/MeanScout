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
    expression,
    index,
    onupdate,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fields: DetailedSingleField[];
    expression: Expression;
    index: number;
    onupdate: (expression: Expression) => void;
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

  function expressionReferencesOther(e: Expression, other: Expression) {
    for (const input of e.inputs.filter((input) => input.from == "expression")) {
      if (input.expressionName == other.name) {
        return true;
      }

      const newExp = surveyRecord.expressions.find((newExp) => newExp.name == input.expressionName);
      if (newExp && expressionReferencesOther(newExp, e)) {
        return true;
      }
    }

    return false;
  }
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
            name: changes.name,
            type: e.currentTarget.value,
            inputs: changes.inputs,
          };
          break;
        case "count":
          changes = {
            name: changes.name,
            type: e.currentTarget.value,
            inputs: changes.inputs,
            valueToCount: "",
          };
          break;
        case "convert":
          changes = {
            name: changes.name,
            type: e.currentTarget.value,
            inputs: changes.inputs,
            converters: [],
            defaultTo: "",
          };
          break;
        case "multiply":
          changes = {
            name: changes.name,
            type: e.currentTarget.value,
            inputs: changes.inputs,
            multiplier: 1,
          };
          break;
        case "divide":
          changes = {
            name: changes.name,
            type: e.currentTarget.value,
            inputs: changes.inputs,
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

<span>Inputs</span>

<div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
  <details open>
    <summary class="cursor-default bg-neutral-800 p-2 pl-3 marker:text-theme">Expressions</summary>
    <div class="flex flex-col gap-2 p-2">
      {#each surveyRecord.expressions.filter((e) => expression.name != e.name && !expressionReferencesOther(e, expression)) as exp}
        {@const inputIndex = changes.inputs.findIndex(
          (input) => input.from == "expression" && input.expressionName == exp.name,
        )}
        {@const isInput = inputIndex != -1}

        <Button
          onclick={() => {
            if (isInput) {
              changes.inputs = changes.inputs.toSpliced(inputIndex, 1);
            } else {
              changes.inputs = [...changes.inputs, { from: "expression", expressionName: exp.name }];
            }
          }}
        >
          {#if isInput}
            <Icon name="square-check" />
            <strong>{exp.name}</strong>
          {:else}
            <Icon style="regular" name="square" />
            {exp.name}
          {/if}
        </Button>
      {/each}
    </div>
  </details>

  <details open>
    <summary class="cursor-default bg-neutral-800 p-2 pl-3 marker:text-theme">Fields</summary>
    <div class="flex flex-col gap-2 p-2">
      {#each fields as field (field.field.id)}
        {@const inputIndex = changes.inputs.findIndex(
          (input) => input.from == "field" && input.fieldId == field.field.id,
        )}
        {@const isInput = inputIndex != -1}

        <Button
          onclick={() => {
            if (isInput) {
              changes.inputs = changes.inputs.toSpliced(inputIndex, 1);
            } else {
              changes.inputs = [...changes.inputs, { from: "field", fieldId: field.field.id }];
            }
          }}
        >
          {#if isInput}
            <Icon name="square-check" />
            <strong>{field.detailedName}</strong>
          {:else}
            <Icon style="regular" name="square" />
            {field.detailedName}
          {/if}
        </Button>
      {/each}
    </div>
  </details>
</div>

{#if error}
  <span>Error: {error}</span>
{/if}
