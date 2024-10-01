<script lang="ts">
  import { download, shareAsFile, shareAsText } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { entryAsCSV, type Entry } from "$lib/entry";
  import { targetStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecord,
    filteredEntries,
    onexport,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    filteredEntries: IDBRecord<Entry>[];
    onexport?: (() => void) | undefined;
  } = $props();

  let dialog: Dialog;

  const exportFileName = `${surveyRecord.name}-entries-${$targetStore}.csv`.replaceAll(" ", "_");

  let error = $state("");

  function entriesAsCSV() {
    return filteredEntries.map(entryAsCSV).join("\n");
  }

  function shareEntriesAsFile() {
    shareAsFile(entriesAsCSV(), exportFileName, "text/csv");
  }

  function shareEntriesAsText() {
    shareAsText(entriesAsCSV(), exportFileName);
  }

  function downloadEntries() {
    download(entriesAsCSV(), exportFileName, "text/csv");
  }

  function onconfirm() {
    const transaction = idb.transaction("entries", "readwrite");
    const entryStore = transaction.objectStore("entries");

    transaction.onabort = () => {
      error = "Could not mark entries as exported";
    };

    transaction.onerror = () => {
      error = "Could not mark entries as exported";
    };

    transaction.oncomplete = () => {
      onexport?.();
      dialog?.close();
    };

    for (let entryRecord of filteredEntries) {
      if (entryRecord.status == "exported") {
        continue;
      }

      entryRecord.status = "exported";
      entryStore.put($state.snapshot(entryRecord));
    }
  }

  function onclose() {
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="share-from-square" />
  <div class="flex flex-col">
    Export
    <small>Share, download</small>
  </div>
</Button>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  <span>Export {filteredEntries.length} {filteredEntries.length == 1 ? "entry" : "entries"}</span>

  {#if "canShare" in navigator}
    <Button onclick={shareEntriesAsFile}>
      <Icon name="share-from-square" />
      <div class="flex flex-col">
        Share
        <small>File</small>
      </div>
    </Button>
    <Button onclick={shareEntriesAsText}>
      <Icon name="share" />
      <div class="flex flex-col">
        Share
        <small>Text snippet</small>
      </div>
    </Button>
  {/if}
  <Button onclick={downloadEntries}>
    <Icon name="download" />
    <div class="flex flex-col">
      Download
      <small>File</small>
    </div>
  </Button>

  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
