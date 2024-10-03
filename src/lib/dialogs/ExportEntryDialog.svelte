<script lang="ts">
  import { createEntryFileName, download, shareAsFile, shareAsText } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { entryAsCSV, type Entry } from "$lib/entry";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecord,
    entryRecord,
    onchange,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecord: IDBRecord<Entry>;
    onchange?: (() => void) | undefined;
  } = $props();

  const exportFileName = createEntryFileName(surveyRecord, entryRecord);

  let dialog: Dialog;
  let entryData = $state("");
  let error = $state("");

  function onopen() {
    entryData = entryAsCSV(entryRecord);
  }

  function shareEntryAsFile() {
    shareAsFile(entryData, exportFileName, "text/csv");
  }

  function shareEntryAsText() {
    shareAsText(entryData, exportFileName);
  }

  function downloadEntry() {
    download(entryData, exportFileName, "text/csv");
  }

  function onconfirm() {
    if (entryRecord.status == "exported") {
      dialog.close();
      return;
    }

    const oldStatus = entryRecord.status;
    entryRecord.status = "exported";

    const request = idb.transaction("entries", "readwrite").objectStore("entries").put($state.snapshot(entryRecord));
    request.onerror = () => {
      entryRecord.status = oldStatus;
      error = `Could not update entry status`;
    };

    request.onsuccess = () => {
      onchange?.();
      dialog.close();
    };
  }

  function onclose() {
    entryData = "";
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="share-from-square" />
  {#if entryRecord.status == "exported"}
    Re-export
  {:else}
    Export
  {/if}
</Button>

<Dialog bind:this={dialog} {onopen} {onconfirm} {onclose}>
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
</Dialog>
