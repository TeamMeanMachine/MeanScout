<script lang="ts">
  import { download, shareAsFile, shareAsText } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { entryAsCSV, type Entry } from "$lib/entry";
  import { transaction } from "$lib/idb";
  import { targetStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    filteredEntries,
    onexport,
  }: {
    surveyRecord: IDBRecord<Survey>;
    filteredEntries: IDBRecord<Entry>[];
    onexport?: (() => void) | undefined;
  } = $props();

  const exportFileName = `${surveyRecord.name}-entries-${$targetStore}.csv`.replaceAll(" ", "_");

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      const entriesTransaction = transaction("entries", "readwrite");
      const entryStore = entriesTransaction.objectStore("entries");

      entriesTransaction.onabort = () => {
        error = "Could not mark entries as exported";
      };

      entriesTransaction.onerror = () => {
        error = "Could not mark entries as exported";
      };

      for (let entryRecord of filteredEntries) {
        if (entryRecord.status == "exported") {
          continue;
        }

        entryRecord.status = "exported";
        entryStore.put($state.snapshot(entryRecord));
      }

      entriesTransaction.oncomplete = () => {
        onexport?.();
        closeDialog();
      };
    },
  };

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
</script>

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
