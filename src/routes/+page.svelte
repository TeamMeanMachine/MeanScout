<script lang="ts">
  import Header from "$lib/components/Header.svelte";
  import { migrateIDB } from "$lib/migrate";
  import "../app.css";
  import LaunchUploadHandler from "./LaunchUploadHandler.svelte";
  import Router from "./Router.svelte";

  let idb = $state<IDBDatabase | undefined>();
  let idbError = $state<string | undefined>();

  const latestVersion = 8;

  const request = indexedDB.open("MeanScout", latestVersion);
  request.onerror = () => (idbError = `${request.error?.message}`);
  request.onupgradeneeded = (e) => migrateIDB(request, e.oldVersion, latestVersion);

  request.onsuccess = () => {
    if (!request.result) {
      idbError = "Could not open IDB";
      return;
    }

    idb = request.result;
  };

  if (navigator.storage) {
    navigator.storage
      .persisted()
      .then((isPersisted) => {
        if (isPersisted) return;
        navigator.storage.persist().catch(console.error);
      })
      .catch(console.error);
  }
</script>

{#if idb}
  <LaunchUploadHandler {idb} />
  <Router {idb} />
{:else if idbError?.length}
  <Header />
  <div class="flex flex-col gap-3 p-3">
    <h2>Error</h2>
    <p>
      MeanScout was unable to access IndexedDB. Double check that your device/browser supports it, and that you haven't
      removed the permission to access it.
    </p>
    <p>Error: {idbError}</p>
  </div>
{/if}
