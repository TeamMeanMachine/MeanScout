<script lang="ts" generics="Props extends Record<string, any>">
  import { flushSync, mount, onDestroy, onMount, unmount, type Component } from "svelte";
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    component,
    props,
  }: {
    component: Component<Props, DialogExports>;
    props: Props;
  } = $props();

  let box: HTMLDialogElement;
  let target: HTMLDivElement;

  let dialog = $state.raw<DialogExports | undefined>();

  let ignoreClose = false;

  function onboxmouseup() {
    if (!ignoreClose) box.close();
    ignoreClose = false;
  }

  function onforminteract() {
    ignoreClose = true;
  }

  onMount(() => {
    dialog = mount(component, { target, props });
    flushSync();

    if (dialog.onopen) {
      dialog.onopen(() => box.showModal());
    } else {
      box.showModal();
    }
  });

  onDestroy(() => {
    if (dialog) {
      unmount(dialog);
    }
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={box}
  onclose={closeDialog}
  onmouseup={onboxmouseup}
  class="m-auto max-h-dvh w-[540px] [max-width:100vw] bg-neutral-900 shadow-2xl backdrop:backdrop-blur-sm"
>
  <form
    method="dialog"
    onsubmit={(e) => {
      e.preventDefault();
      dialog?.onconfirm?.();
    }}
    onmouseup={onforminteract}
    onmousedown={onforminteract}
    class="flex max-h-dvh flex-col gap-3 p-3"
  >
    <div bind:this={target} class="contents"></div>

    <div class="flex flex-wrap justify-between gap-3">
      <Button onclick={() => box.close()}>
        <Icon name="xmark" />
        {#if dialog?.onconfirm}
          Cancel
        {:else}
          Close
        {/if}
      </Button>

      {#if dialog?.onconfirm}
        <Button type="submit">
          <Icon name="check" />
          Confirm
        </Button>
      {/if}
    </div>
  </form>
</dialog>
