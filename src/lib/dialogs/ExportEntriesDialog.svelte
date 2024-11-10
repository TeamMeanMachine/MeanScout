<script lang="ts">
  import { download, share } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { entryToCSV, type Entry } from "$lib/entry";
  import { transaction } from "$lib/idb";
  import { targetStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    filteredEntries,
    type,
    onexport,
  }: {
    surveyRecord: IDBRecord<Survey>;
    filteredEntries: IDBRecord<Entry>[];
    type: "qrcode" | "file";
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
    return filteredEntries.map(entryToCSV).join("\n");
  }

  function shareEntriesAsFile() {
    share(entriesAsCSV(), exportFileName, "text/csv");
  }

  function saveEntriesAsFile() {
    download(entriesAsCSV(), exportFileName, "text/csv");
  }
</script>

<span>{filteredEntries.length} {filteredEntries.length == 1 ? "entry" : "entries"}</span>

{#if type == "qrcode"}
  <QRCodeDisplay data={entriesAsCSV()} />
{:else if type == "file"}
  {#if "canShare" in navigator}
    <Button onclick={shareEntriesAsFile}>
      <Icon name="share-from-square" />
      Share
    </Button>
  {/if}
  <Button onclick={saveEntriesAsFile}>
    <Icon name="file-code" />
    Save
  </Button>
{/if}

<span>Mark as exported?</span>

{#if error}
  <span>{error}</span>
{/if}
