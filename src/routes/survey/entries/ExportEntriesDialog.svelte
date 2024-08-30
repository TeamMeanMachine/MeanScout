<script lang="ts">
  import { download, shareAsFile, shareAsText } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { entryAsCSV, type Entry } from "$lib/entry";
  import { targetStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entries,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entries: IDBRecord<Entry>[];
  } = $props();

  let dialog: Dialog;

  const exportFileName = `${surveyRecord.name}-entries-${$targetStore}.csv`.replaceAll(" ", "_");

  function entriesAsCSV() {
    return entries.map(entryAsCSV).join("\n");
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

<Button onclick={() => dialog.open()}>
  <Icon name="share-from-square" />
  Export entries
</Button>

<Dialog bind:this={dialog}>
  <span>Export entries</span>
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
  <Button onclick={downloadEntries}>
    <Icon name="download" />
    Download as file
  </Button>
</Dialog>
