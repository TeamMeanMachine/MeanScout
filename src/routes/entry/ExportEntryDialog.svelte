<script lang="ts">
  import { createEntryFileName, download, shareAsFile, shareAsText } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { entryAsCSV, type Entry } from "$lib/entry";
  import type { Survey } from "$lib/survey";
  import QrCodeDisplay from "./QRCodeDisplay.svelte";

  let {
    surveyRecord,
    entry,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entry: IDBRecord<Entry>;
  } = $props();

  const exportFileName = createEntryFileName(surveyRecord, entry);

  let dialog: Dialog;
  let entryData = $state("");

  function onopen() {
    entryData = entryAsCSV(entry);
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

  function onclose() {
    entryData = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="share-from-square" />
  Export
</Button>

<Dialog bind:this={dialog} {onopen} {onclose}>
  <span>Export entry</span>

  {#if entryData}
    <QrCodeDisplay data={entryData} />
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
</Dialog>
