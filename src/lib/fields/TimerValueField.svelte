<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { TimerField } from "$lib/field";

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

  function start() {
    running = true;
    interval = window.setInterval(() => running && (value += 0.1), 100);
    onchange && onchange();
  }

  function pause() {
    running = false;
    clearInterval(interval);
    onchange && onchange();
  }

  function stop() {
    if (running) {
      pause();
    }
    value = 0;
    onchange && onchange();
  }
</script>

<div class="flex flex-col">
  {field.name}
  <div class="flex flex-wrap">
    <Button onclick={running ? pause : start}>
      <Icon name={running ? "pause" : "play"} />
    </Button>
    <span class="w-12 bg-neutral-800 p-2 text-center">{value.toFixed(1)}</span>
    <Button onclick={stop}>
      <Icon name="stop" />
    </Button>
  </div>
</div>
