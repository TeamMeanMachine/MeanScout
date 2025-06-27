<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { sessionStorageStore } from "$lib";
  import { compSchema, importComp, type Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import { Undo2Icon } from "@lucide/svelte";

  let {
    compRecord,
  }: {
    compRecord: IDBRecord<Comp>;
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("import-data-tab", $cameraStore ? "qrfcode" : "file");

  let files = $state<FileList | undefined>();
  let importedComp = $state<Comp | undefined>();
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (!importedComp) {
        error = "No input";
        return;
      }

      if (importedComp.name != compRecord.name) {
        error = "Different comp names";
        return;
      }

      const overwriteRequest = idb.objectStore("comps", "readwrite").put({
        ...$state.snapshot(importedComp),
        id: compRecord.id,
        modified: new Date(),
      });

      overwriteRequest.onerror = () => {
        error = "Could not overwrite comp";
      };

      overwriteRequest.onsuccess = () => {
        invalidateAll();
        closeDialog();
      };
    },
  };

  async function onchange() {
    if (!files?.length) {
      return;
    }

    onread(await files[0].text());
  }

  function onread(data: string) {
    const jsonResult = importComp(data);
    if (!jsonResult.success) {
      error = jsonResult.error;
      return;
    }

    const schemaResult = compSchema.safeParse(jsonResult.comp);
    if (!schemaResult.success) {
      error = schemaResult.error.toString();
      return;
    }

    importedComp = schemaResult.data;
  }

  function retry() {
    error = "";
    importedComp = undefined;
  }
</script>

<span>Overwrite "{compRecord.name}"</span>

{#if $cameraStore}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
{/if}

{#if $tab == "qrfcode" && $cameraStore}
  {#if importedComp}
    {@render preview()}

    <Button onclick={retry}>
      <Undo2Icon class="text-theme" />
      Retry
    </Button>
  {:else}
    <QRCodeReader {onread} />
  {/if}
{:else}
  <input
    type="file"
    accept=".json,.txt"
    bind:files
    {onchange}
    class="file:text-theme file:mr-3 file:border-none file:bg-neutral-800 file:p-2"
  />

  {#if importedComp}
    {@render preview()}
  {/if}
{/if}

{#snippet preview()}
  <span>
    <span class="text-xs font-light">Name</span>
    <span class="font-bold">{importedComp?.name}</span>
  </span>
  {#if importedComp?.tbaEventKey}
    <span>
      <span class="text-xs font-light">TBA Event Key</span>
      <span class="font-bold">{importedComp?.tbaEventKey}</span>
    </span>
  {/if}
{/snippet}

{#if error}
  <span>{error}</span>
{/if}
