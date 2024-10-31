<script lang="ts">
  import { createEntryFileName, download, shareAsFile, shareAsText } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { entryAsCSV, type Entry } from "$lib/entry";
  import { objectStore } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecord,
    onexport,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entryRecord: IDBRecord<Entry>;
    onexport?: (entry: IDBRecord<Entry>) => void;
  } = $props();

  const exportFileName = createEntryFileName(surveyRecord, entryRecord);

  let entry = $state(structuredClone($state.snapshot(entryRecord)));
  let entryData = $state(entryAsCSV(entry));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (entry.status == "exported") {
        closeDialog();
        return;
      }

      entry.status = "exported";

      const request = objectStore("entries", "readwrite").put($state.snapshot(entry));
      request.onerror = () => {
        error = `Could not update entry status`;
      };

      request.onsuccess = () => {
        onexport?.(entry);
        closeDialog();
      };
    },
  };

  function shareEntryAsFile() {
    shareAsFile(entryData, exportFileName, "text/csv");
  }

  function shareEntryAsText() {
    shareAsText(entryData, exportFileName);
  }

  function downloadEntry() {
    download(entryData, exportFileName, "text/csv");
  }
</script>

<span>Export entry</span>

{#if entryData}
  <QRCodeDisplay data={entryData} />
{/if}

{#if "canShare" in navigator}
  <Button onclick={shareEntryAsFile}>
    <Icon name="share-from-square" />
    Share as file
  </Button>
  <Button onclick={shareEntryAsText}>
    <Icon name="share" />
    Share as text snippet
  </Button>
{/if}
<Button onclick={downloadEntry}>
  <Icon name="download" />
  Download as file
</Button>

{#if error}
  <span>{error}</span>
{/if}
