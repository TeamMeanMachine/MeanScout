<script lang="ts">
  import { download, shareAsFile, shareAsText } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
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

  let qrCodeData = $state<string | undefined>();

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

  function saveEntriesAsFile() {
    download(entriesAsCSV(), exportFileName, "text/csv");
  }

  function exportAsQRCode() {
    qrCodeData = entriesAsCSV();
  }
</script>

<span>{filteredEntries.length} {filteredEntries.length == 1 ? "entry" : "entries"}</span>

{#if qrCodeData}
  <QrCodeDisplay data={qrCodeData} />
{:else}
  <Button onclick={exportAsQRCode}>
    <Icon name="qrcode" />
    Export as QR code
  </Button>
{/if}

{#if "canShare" in navigator}
  <Button onclick={shareEntriesAsFile}>
    <Icon name="share-from-square" />
    Share as file
  </Button>
  <Button onclick={shareEntriesAsText}>
    <Icon name="share" />
    Share as text snippet
  </Button>
{/if}
<Button onclick={saveEntriesAsFile}>
  <Icon name="download" />
  Save as file
</Button>

{#if error}
  <span>{error}</span>
{/if}
