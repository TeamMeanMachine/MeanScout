<script lang="ts">
  import { createEntryFileName, download, share } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { entryToCSV, type Entry } from "$lib/entry";
  import { objectStore } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecord,
    onexport,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entryRecord: IDBRecord<Entry>;
    onexport: (entry: IDBRecord<Entry>) => void;
  } = $props();

  const exportFileName = createEntryFileName(surveyRecord, entryRecord);

  let entry = $state.snapshot(entryRecord);
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
        onexport(entry);
        closeDialog();
      };
    },
  };

  function shareEntryAsFile() {
    share(entryToCSV(entry), exportFileName, "text/csv");
  }

  function saveEntryAsFile() {
    download(entryToCSV(entry), exportFileName, "text/csv");
  }
</script>

<span>Export entry</span>

<QRCodeDisplay data={entryToCSV(entry)} />

{#if "canShare" in navigator}
  <Button onclick={shareEntryAsFile}>
    <Icon name="share-from-square" />
    Share
  </Button>
{/if}
<Button onclick={saveEntryAsFile}>
  <Icon name="file-code" />
  Save
</Button>

{#if entry.status != "exported"}
  <span>Mark as exported?</span>
{/if}

{#if error}
  <span>{error}</span>
{/if}
