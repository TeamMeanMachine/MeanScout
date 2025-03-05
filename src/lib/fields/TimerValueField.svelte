<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { TimerField } from "$lib/field";
  import { onDestroy } from "svelte";

  let {
    field,
    value = $bindable(),
    onchange = undefined,
  }: {
    field: TimerField;
    value: number;
    onchange?: (() => void) | undefined;
  } = $props();

  let running = $state(false);
  let interval: number;
  let startTime = 0;
  let display = $state(value);

  function start() {
    startTime = Date.now();
    running = true;
    interval = window.setInterval(() => {
      if (running) {
        display = value + (Date.now() - startTime) / 1000;
      }
    }, 100);
  }

  function pause() {
    value += (Date.now() - startTime) / 1000;
    display = value;
    running = false;
    clearInterval(interval);
    onchange && onchange();
  }

  function reset() {
    if (running) {
      pause();
    }
    value = 0;
    display = value;
    onchange && onchange();
  }

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<div class="flex flex-col">
  <span class="font-light">{field.name}</span>
  <div class="flex flex-wrap">
    <Button onclick={running ? pause : start}>
      <Icon name={running ? "pause" : "play"} />
    </Button>
    <span class="w-12 bg-neutral-800 p-2 text-center {value > 0 && !running ? 'font-bold' : 'font-light'}">
      {display.toFixed(1)}
    </span>
    <Button onclick={reset}>
      <Icon name="stop" />
    </Button>
  </div>
  {#if field.tip}
    <small class="pt-1">{field.tip}</small>
  {/if}
</div>
