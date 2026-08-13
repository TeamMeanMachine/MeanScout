<script lang="ts" generics="Props extends Dialog.Props">
  import { Dialog } from "$lib/dialog";
  import { onMount, type Component } from "svelte";

  const {
    Content,
    props,
  }: {
    Content: Component<Props, Dialog.Exports>;
    props: Props;
  } = $props();

  let box: HTMLDialogElement;
  let content = $state.raw<Dialog.Exports>({});

  Dialog.setContext({ close: () => box.close() });

  onMount(() => box.showModal());
</script>

<dialog
  bind:this={box}
  closedby="any"
  onclose={() => Dialog.stack.delete(Content)}
  class="m-auto max-h-dvh w-135 max-w-[100vw] overflow-y-hidden border border-neutral-600 bg-neutral-900 shadow-2xl shadow-black backdrop:bg-black backdrop:opacity-45"
>
  <form
    method="dialog"
    onsubmit={(e) => {
      e.preventDefault();
      content.onformsubmit?.();
    }}
    class="flex max-h-dvh flex-col overflow-y-auto"
  >
    <Content bind:this={content} {...props} />
  </form>
</dialog>
