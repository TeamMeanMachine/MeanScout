<script lang="ts">
  import type { Snippet } from "svelte";
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";

  let {
    onopen = undefined,
    onconfirm = undefined,
    onclose = undefined,
    children,
  }: {
    onopen?: ((element: HTMLDialogElement) => void) | undefined;
    onconfirm?: (() => void) | undefined;
    onclose?: (() => void) | undefined;
    children: Snippet;
  } = $props();

  let element: HTMLDialogElement;

  let ignoreClose = false;

  function closeCallback() {
    if (!ignoreClose) element.close();
    ignoreClose = false;
  }

  function cancelClose() {
    ignoreClose = true;
  }

  export function open() {
    onopen && onopen(element);
    element.showModal();
  }

  export function close() {
    element.close();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={element}
  {onclose}
  onmouseup={closeCallback}
  class="max-h-dvh w-[min(100dvw,540px)] bg-neutral-900 shadow-2xl backdrop:backdrop-blur"
>
  <div onmouseup={cancelClose} onmousedown={cancelClose} class="flex flex-col gap-3 p-3">
    {@render children()}
    <div class="flex flex-wrap justify-between gap-3">
      {#if onconfirm}
        <Button onclick={onconfirm} classes="flex items-center gap-1">
          <Icon name="check" />
          Confirm
        </Button>
      {/if}
      <Button onclick={close} classes="flex items-center gap-1">
        <Icon name="xmark" />
        Close
      </Button>
    </div>
  </div>
</dialog>
