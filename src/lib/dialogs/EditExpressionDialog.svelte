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
    index,
    onupdate,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fields: DetailedSingleField[];
    index: number;
    onupdate: (expression: Expression) => void;
  } = $props();

  let expression = $state(structuredClone($state.snapshot(surveyRecord.expressions[index])));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      expression.name = expression.name.trim();

      if (!expression.name) {
        error = "name can't be empty!";
        return;
      }

      if (surveyRecord.expressions.find((e, i) => e.name == expression.name && i != index)) {
        error = "name must be unique!";
        return;
      }

      if (expression.type == "divide" && expression.divisor == 0) {
        error = "divisor can't be 0!";
        return;
      }

      if (expression.type == "convert") {
        expression.converters = expression.converters.map(({ from, to }) => ({
          from: parseValueFromString(from),
          to: parseValueFromString(to),
        }));
        expression.defaultTo = parseValueFromString(expression.defaultTo);
      }

      const prevName = surveyRecord.expressions[index].name;

      if (expression.name != prevName) {
        surveyRecord.expressions = surveyRecord.expressions.map((e) => {
          e.inputs = e.inputs.map((input) => {
            if (input.from == "expression" && input.expressionName == prevName) {
              input.expressionName = expression.name;
            }

            return input;
          });

          return e;
        });

        surveyRecord.pickLists = surveyRecord.pickLists.map((pickList) => {
          pickList.weights = pickList.weights.map((weight) => {
            if (weight.expressionName == prevName) {
              weight.expressionName = expression.name;
            }

            return weight;
          });

          return pickList;
        });
      }

      onupdate(expression);
      closeDialog();
    },
  };
</script>

<span>Edit expression</span>

<label class="flex flex-col">
  Name
  <input bind:value={expression.name} class="bg-neutral-800 p-2 text-theme" />
</label>

<label class="flex flex-col">
  Type
  <select
    value={expression.type}
    onchange={(e) => {
      switch (e.currentTarget.value) {
        case "average":
        case "min":
        case "max":
        case "sum":
          expression = {
            name: expression.name,
            type: e.currentTarget.value,
            inputs: expression.inputs,
          };
          break;
        case "count":
          expression = {
            name: expression.name,
            type: e.currentTarget.value,
            inputs: expression.inputs,
            valueToCount: "",
          };
          break;
        case "convert":
          expression = {
            name: expression.name,
            type: e.currentTarget.value,
            inputs: expression.inputs,
            converters: [],
            defaultTo: "",
          };
          break;
        case "multiply":
          expression = {
            name: expression.name,
            type: e.currentTarget.value,
            inputs: expression.inputs,
            multiplier: 1,
          };
          break;
        case "divide":
          expression = {
            name: expression.name,
            type: e.currentTarget.value,
            inputs: expression.inputs,
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

{#if expression.type == "count"}
  <label class="flex flex-col">
    Value to count
    <input bind:value={expression.valueToCount} class="bg-neutral-800 p-2 text-theme" />
  </label>
{:else if expression.type == "convert"}
  <Button
    onclick={() => {
      if (expression.type != "convert") return;
      openDialog(EditConvertersDialog, {
        expression,
        onedit(converters, defaultTo) {
          if (expression.type != "convert") return;
          expression.converters = structuredClone($state.snapshot(converters)).map(({ from, to }) => ({
            from: parseValueFromString(from),
            to: parseValueFromString(to),
          }));
          expression.defaultTo = parseValueFromString(structuredClone($state.snapshot(defaultTo)));
        },
      });
    }}
  >
    <Icon name="pen" />
    Edit Converters
  </Button>
{:else if expression.type == "multiply"}
  <label class="flex flex-col">
    Multiplier
    <input type="number" bind:value={expression.multiplier} class="bg-neutral-800 p-2 text-theme" />
  </label>
{:else if expression.type == "divide"}
  <label class="flex flex-col">
    Divisor
    <input type="number" bind:value={expression.divisor} class="bg-neutral-800 p-2 text-theme" />
  </label>
{/if}

<span>Inputs</span>

<div class="flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
  <details open>
    <summary class="cursor-default bg-neutral-800 p-2 pl-3 marker:text-theme">Expressions</summary>
    <div class="flex flex-col gap-2 p-2">
      {#each surveyRecord.expressions as exp}
        {@const inputIndex = expression.inputs.findIndex(
          (input) => input.from == "expression" && input.expressionName == exp.name,
        )}
        {@const isInput = inputIndex != -1}

        <Button
          onclick={() => {
            if (isInput) {
              expression.inputs = expression.inputs.toSpliced(inputIndex, 1);
            } else {
              expression.inputs = [...expression.inputs, { from: "expression", expressionName: exp.name }];
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
        {@const inputIndex = expression.inputs.findIndex(
          (input) => input.from == "field" && input.fieldId == field.field.id,
        )}
        {@const isInput = inputIndex != -1}

        <Button
          onclick={() => {
            if (isInput) {
              expression.inputs = expression.inputs.toSpliced(inputIndex, 1);
            } else {
              expression.inputs = [...expression.inputs, { from: "field", fieldId: field.field.id }];
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
