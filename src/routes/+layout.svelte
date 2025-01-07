<script lang="ts">
  import DialogBox from "$lib/components/DialogBox.svelte";
  import LaunchUploadHandler from "$lib/components/LaunchUploadHandler.svelte";
  import { closeAllDialogs, type DialogState, subscribeDialog } from "$lib/dialog";
  import "../app.css";

  let { children } = $props();

  if (navigator.storage) {
    navigator.storage
      .persisted()
      .then((isPersisted) => {
        if (isPersisted) return;
        navigator.storage.persist().catch(console.error);
      })
      .catch(console.error);
  }

  let dialogStack = $state<DialogState[]>([]);
  subscribeDialog((state) => {
    dialogStack = state;
  });

  onhashchange = () => closeAllDialogs();
</script>

{#each dialogStack as { component, props }}
  <DialogBox {component} {props} />
{/each}

<LaunchUploadHandler />

{@render children()}
