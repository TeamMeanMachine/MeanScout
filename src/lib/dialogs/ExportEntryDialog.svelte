<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { exportEntriesCompressed, saveEntryAsFile, shareEntryAsFile, type Entry } from "$lib/entry";
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
</script>

<span>Export entry</span>

{#await exportEntriesCompressed([entry]) then data}
  <QrCodeDisplay {data} />
{/await}

{#if "canShare" in navigator}
  <Button onclick={() => shareEntryAsFile(entry, surveyRecord)}>
    <Icon name="share-from-square" />
    Share
  </Button>
{/if}
<Button onclick={() => saveEntryAsFile(entry, surveyRecord)}>
  <Icon name="file-code" />
  Save
</Button>

{#if entry.status != "exported"}
  <span>Mark as exported?</span>
{/if}

{#if error}
  <span>{error}</span>
{/if}
