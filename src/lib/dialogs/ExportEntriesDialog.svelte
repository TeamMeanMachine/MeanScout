<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { exportEntriesCompressed, saveEntryAsFile, shareEntryAsFile, type Entry } from "$lib/entry";
  import { transaction } from "$lib/idb";
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
    onexport: () => void;
  } = $props();

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

        entryStore.put({ ...$state.snapshot(entryRecord), status: "exported", modified: new Date() });
      }

      entriesTransaction.oncomplete = () => {
        onexport();
        closeDialog();
      };
    },
  };
</script>

<span>Export {filteredEntries.length} {filteredEntries.length == 1 ? "entry" : "entries"}</span>

{#if type == "qrcode"}
  {#await exportEntriesCompressed($state.snapshot(filteredEntries)) then data}
    <QRCodeDisplay {data} />
  {/await}
{:else if type == "file"}
  {#if "canShare" in navigator}
    <Button onclick={() => shareEntryAsFile(filteredEntries, surveyRecord)}>
      <Icon name="share-from-square" />
      Share
    </Button>
  {/if}
  <Button onclick={() => saveEntryAsFile(filteredEntries, surveyRecord)}>
    <Icon name="file-code" />
    Save
  </Button>
{/if}

<span>Mark as exported?</span>

{#if error}
  <span>{error}</span>
{/if}
