<script lang="ts">
  import DialogBox from "$lib/components/DialogBox.svelte";
  import LaunchUploadHandler from "$lib/components/LaunchUploadHandler.svelte";
  import Router from "$lib/components/Router.svelte";
  import { subscribeDialog, type DialogState } from "$lib/dialog";
  import { initIDB } from "$lib/idb";
  import "../app.css";

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

  let idbError = $state<undefined | false | string>();
  initIDB((error) => {
    idbError = error ?? false;
  });
</script>

{#each dialogStack as { component, props }}
  <DialogBox {component} {props} />
{/each}

{#if idbError}
  <header class="flex min-h-11 items-center gap-3">
    <img src="./logo.svg" alt="" width="25" height="25" />
    <h1 class="font-bold">MeanScout</h1>
  </header>
  <div class="flex flex-col gap-3">
    <h2>Error</h2>
    <p>
      MeanScout was unable to access IndexedDB. Double check that your device/browser supports it, and that you haven't
      removed the permission to access it.
    </p>
    <p>Error: {idbError}</p>
  </div>
{:else if idbError == false}
  <LaunchUploadHandler />
  <Router />
{/if}
