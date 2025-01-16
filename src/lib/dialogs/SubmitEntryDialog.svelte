<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { exportEntriesCompressed, type Entry } from "$lib/entry";
  import { getDefaultFieldValue, type DetailedSingleField } from "$lib/field";
  import { objectStore } from "$lib/idb";

  let {
    fields,
    entryRecord,
    onexport,
  }: {
    fields: DetailedSingleField[];
    entryRecord: IDBRecord<Entry>;
    onexport: () => void;
  } = $props();

  let isExporting = $state(false);
  let compressedEntry = $state<Uint8Array>();
  let error = $state("");

  export const { onopen, onconfirm }: DialogExports = {
    async onopen(open) {
      for (let i = 0; i < entryRecord.values.length; i++) {
        const value = entryRecord.values[i];
        if (value == undefined || typeof value !== typeof getDefaultFieldValue(fields[i].field)) {
          error = `Invalid value for ${fields[i].field.name}`;
          open();
          return;
        }
      }

      compressedEntry = await exportEntriesCompressed([entryRecord]);
      open();
    },
    onconfirm() {
      if (error) {
        return;
      }

      let submittedEntry: Entry = {
        ...$state.snapshot(entryRecord),
        status: isExporting ? "exported" : "submitted",
        modified: new Date(),
      };

      const submitRequest = objectStore("entries", "readwrite").put(submittedEntry);
      submitRequest.onerror = () => {
        error = `Could not submit entry: ${submitRequest.error?.message}`;
      };

      submitRequest.onsuccess = () => {
        onexport();
        closeDialog();
      };
    },
  };
</script>

<span>
  Submit
  {#if isExporting}
    and export
  {/if}
</span>

<Button onclick={() => (isExporting = !isExporting)}>
  {#if isExporting}
    <Icon name="xmark" />
    Don't export
  {:else}
    <Icon name="share-from-square" />
    Export
  {/if}
</Button>

{#if isExporting && compressedEntry}
  <QRCodeDisplay data={compressedEntry} />
{/if}

{#if error}
  <span>{error}</span>
{/if}
