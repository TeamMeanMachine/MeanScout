<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { type Entry } from "$lib/entry";
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

  const entryExport = sessionStorageStore<"true" | "">("entry-export", "");

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

      open();
    },
    onconfirm() {
      if (error) {
        return;
      }

      let submittedEntry: Entry = {
        ...$state.snapshot(entryRecord),
        status: $entryExport ? "exported" : "submitted",
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
  {#if $entryExport}
    Submit as exported?
  {:else}
    Submit?
  {/if}
</span>

{#if error}
  <span>{error}</span>
{/if}
