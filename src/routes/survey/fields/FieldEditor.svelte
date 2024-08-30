<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { fieldTypes, type Field } from "$lib/field";
  import FieldOptionsDialog from "./FieldOptionsDialog.svelte";

  let {
    fields = $bindable(),
    field = $bindable(),
    fieldIndex,
    disabled = false,
    onchange = undefined,
  }: {
    fields: Field[];
    field: Field;
    fieldIndex: number;
    disabled: boolean;
    onchange: (() => void) | undefined;
  } = $props();

  function switchFieldType(to: string) {
    switch (to) {
      case "toggle":
      case "number":
      case "text":
      case "rating":
      case "timer":
        field = {
          name: field.name,
          type: to,
        };
        break;
      case "select":
        field = {
          name: field.name,
          type: to,
          values: [],
        };
        break;
      case "group":
        field = {
          name: field.name,
          type: to,
          fields: [],
        };
        break;
    }
    onchange && onchange();
  }

  function moveField(by: number) {
    fields = fields.toSpliced(fieldIndex + by, 0, ...fields.splice(fieldIndex, 1));
    onchange && onchange();
  }

  function toggleAllowNegative() {
    if (field.type == "number") {
      field.allowNegative = !field.allowNegative;
      onchange && onchange();
    }
  }

  function deleteSelectValue(index: number) {
    if (field.type == "select") {
      field.values = field.values.filter((_, i) => i != index);
      onchange && onchange();
    }
  }

  function newSelectValue() {
    if (field.type == "select") {
      field.values = [...field.values, ""];
      onchange && onchange();
    }
  }

  function toggleLong() {
    if (field.type == "text") {
      field.long = !field.long;
      onchange && onchange();
    }
  }

  function newField() {
    if (field.type == "group") {
      field.fields = [...field.fields, { name: "", type: "toggle" }];
      onchange && onchange();
    }
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex flex-wrap items-end gap-2">
    <label class="flex flex-col">
      Name
      <input bind:value={field.name} {onchange} {disabled} class="bg-neutral-800 p-2 text-theme" />
    </label>
    <label class="flex flex-col">
      Type
      <select
        value={field.type}
        onchange={(e) => switchFieldType(e.currentTarget.value)}
        {disabled}
        class="bg-neutral-800 p-2 capitalize text-theme"
      >
        {#each fieldTypes as fieldType}
          <option>{fieldType}</option>
        {/each}
      </select>
    </label>
  </div>

  {#if !disabled}
    <div class="flex flex-wrap gap-2">
      <Button disabled={fieldIndex == 0} onclick={() => moveField(-1)}>
        <Icon name="arrow-up" />
      </Button>
      <Button disabled={fieldIndex == fields.length - 1} onclick={() => moveField(1)}>
        <Icon name="arrow-down" />
      </Button>
      <FieldOptionsDialog bind:fields bind:field {fieldIndex} {onchange} />
    </div>

    {#if field.type == "number"}
      <div class="flex gap-2 pl-3">
        <Button onclick={toggleAllowNegative}>
          {#if field.allowNegative}
            <Icon name="square-check" />
          {:else}
            <Icon style="regular" name="square" />
          {/if}
          Allow negative
        </Button>
      </div>
    {:else if field.type == "select"}
      <div class="flex flex-col gap-2 pl-3">
        {field.name} Values
        {#each field.values as _, i}
          <div class="flex gap-2">
            <input bind:value={field.values[i]} {onchange} class="w-48 bg-neutral-800 p-2 text-theme" />
            <Button onclick={() => deleteSelectValue(i)}>
              <Icon name="trash" />
            </Button>
          </div>
        {/each}
        <div>
          <Button onclick={newSelectValue}>
            <Icon name="plus" />
          </Button>
        </div>
      </div>
    {:else if field.type == "text"}
      <div class="flex flex-col items-start gap-2 pl-3">
        <label class="flex flex-col">
          Tip
          <input bind:value={field.tip} {onchange} class="bg-neutral-800 p-2 text-theme" />
        </label>
        <Button onclick={toggleLong}>
          {#if field.long}
            <Icon name="square-check" />
          {:else}
            <Icon style="regular" name="square" />
          {/if}
          Long
        </Button>
      </div>
    {:else if field.type == "group"}
      <div class="flex flex-col gap-3 pl-3 pt-1">
        {field.name} Fields
        {#each field.fields as innerField, innerFieldIndex (innerField)}
          <svelte:self
            bind:fields={field.fields}
            bind:field={field.fields[innerFieldIndex]}
            onChange={onchange}
            fieldIndex={innerFieldIndex}
          />
        {/each}
        <div>
          <Button onclick={newField}>
            <Icon name="plus" />
          </Button>
        </div>
      </div>
    {/if}
  {/if}
</div>
