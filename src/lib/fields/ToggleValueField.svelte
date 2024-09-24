<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { ToggleField } from "$lib/field";

  let {
    field,
    value = $bindable(),
    onchange = undefined,
  }: {
    field: ToggleField;
    value: boolean;
    onchange?: (() => void) | undefined;
  } = $props();

  function toggle() {
    value = !value;
    onchange && onchange();
  }
</script>

<div class="flex flex-col">
  <Button onclick={toggle} classes="self-start">
    {#if value}
      <Icon name="square-check" />
    {:else}
      <Icon style="regular" name="square" />
    {/if}
    {field.name}
  </Button>
  {#if field.tip}
    <small class="pt-1">{field.tip}</small>
  {/if}
</div>
