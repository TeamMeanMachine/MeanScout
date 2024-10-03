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
    onopen?.(element);
    element.showModal();
    element.focus();
  }

  export function close() {
    element.close();
    ignoreClose = false;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={element}
  {onclose}
  onmouseup={closeCallback}
  class="max-h-dvh w-[540px] bg-neutral-900 shadow-2xl [max-width:100vw] backdrop:backdrop-blur"
>
  <form
    method="dialog"
    onsubmit={(e) => e.preventDefault()}
    onmouseup={cancelClose}
    onmousedown={cancelClose}
    class="flex max-h-dvh flex-col gap-3 p-3"
  >
    {@render children()}
    <div class="flex flex-wrap justify-between gap-3">
      <Button onclick={close}>
        <Icon name="xmark" />
        {#if onconfirm}
          Cancel
        {:else}
          Close
        {/if}
      </Button>
      {#if onconfirm}
        <Button type="submit" onclick={onconfirm}>
          <Icon name="check" />
          Confirm
        </Button>
      {/if}
    </div>
  </form>
</dialog>
