<script lang="ts">
  import { download, sessionStorageStore, share } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { entryToCSV, exportEntries, type Entry } from "$lib/entry";
  import { objectStore, transaction } from "$lib/idb";
  import { targetStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import { FileJsonIcon, FileSpreadsheetIcon, Share2Icon } from "@lucide/svelte";

  let {
    surveyRecord,
    entries,
    onexport,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entries: IDBRecord<Entry>[];
    onexport: (newEntry?: IDBRecord<Entry>) => void;
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("export-data-tab", "qrfcode");

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (entries.length == 1) {
        if (entries[0].status == "exported") {
          closeDialog();
          return;
        }

        const updated: IDBRecord<Entry> = { ...$state.snapshot(entries[0]), status: "exported", modified: new Date() };

        const request = objectStore("entries", "readwrite").put($state.snapshot(updated));
        request.onerror = () => {
          error = "Could not mark entry as exported";
        };

        request.onsuccess = () => {
          onexport(updated);
          closeDialog();
        };

        return;
      }

      const entriesTransaction = transaction("entries", "readwrite");
      const entryStore = entriesTransaction.objectStore("entries");

      entriesTransaction.onabort = () => {
        error = "Could not mark entries as exported";
      };

      entriesTransaction.onerror = () => {
        error = "Could not mark entries as exported";
      };

      for (let entry of entries) {
        if (entry.status == "exported") {
          continue;
        }

        entryStore.put({ ...$state.snapshot(entry), status: "exported", modified: new Date() });
      }

      entriesTransaction.oncomplete = () => {
        onexport();
        closeDialog();
      };
    },
  };

  function entriesAsCSV() {
    return entries.map(entryToCSV).join("\n");
  }

  function createEntryFileName() {
    if (entries.length == 1) {
      const entry = entries[0];

      const fileName = `${surveyRecord.name}-entry-${entry.team}`;

      if (entry.type == "match") {
        return `${fileName}-${entry.match}-${entry.absent}`.replaceAll(" ", "_");
      } else {
        return fileName.replaceAll(" ", "_");
      }
    }

    return `${surveyRecord.name}-entries-${$targetStore}`.replaceAll(" ", "_");
  }

  function shareEntryAsCsvFile() {
    share(entriesAsCSV(), `${createEntryFileName()}.csv`, "text/csv");
  }

  function saveEntryAsCsvFile() {
    download(entriesAsCSV(), `${createEntryFileName()}.csv`, "text/csv");
  }

  function shareEntryAsJsonFile() {
    share(exportEntries(entries), `${createEntryFileName()}.txt`, "text/plain");
  }

  function saveEntryAsJsonFile() {
    download(exportEntries(entries), `${createEntryFileName()}.json`, "application/json");
  }
</script>

<span>
  Export
  {#if entries.length == 1}
    entry
  {:else}
    {entries.length} entries
  {/if}
</span>

<div class="flex flex-wrap gap-2 text-sm">
  <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
  <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
</div>

{#if $tab == "qrfcode"}
  <QRCodeDisplay data={exportEntries(entries)} />
{:else}
  {#if "canShare" in navigator}
    <div class="flex flex-wrap gap-2">
      <Button onclick={shareEntryAsCsvFile} class="grow">
        <Share2Icon class="text-theme" />
        <div class="flex flex-col">
          Share
          <small>As CSV</small>
        </div>
      </Button>
      <Button onclick={shareEntryAsJsonFile} class="grow">
        <Share2Icon class="text-theme" />
        <div class="flex flex-col">
          Share
          <small>As JSON</small>
        </div>
      </Button>
    </div>
  {/if}

  <div class="flex flex-wrap gap-2">
    <Button onclick={saveEntryAsCsvFile} class="grow">
      <FileSpreadsheetIcon class="text-theme" />
      <div class="flex flex-col">
        Save
        <small>As CSV</small>
      </div>
    </Button>
    <Button onclick={saveEntryAsJsonFile} class="grow">
      <FileJsonIcon class="text-theme" />
      <div class="flex flex-col">
        Save
        <small>As JSON</small>
      </div>
    </Button>
  </div>
{/if}

<span>Mark as exported?</span>

{#if error}
  <span>{error}</span>
{/if}
