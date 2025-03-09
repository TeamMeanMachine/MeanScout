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

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) {
        return;
      }

      let submittedEntry: Entry = {
        ...$state.snapshot(entryRecord),
        status: $entryExport ? "exported" : "submitted",
        modified: new Date(),
      };

      if (submittedEntry.type == "match" && submittedEntry.absent) {
        submittedEntry.values = fields.map((field) => getDefaultFieldValue(field.field));
      }

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
    Submit this entry <strong>as exported?</strong>
  {:else}
    Submit this entry?
  {/if}
</span>

{#if error}
  <span>{error}</span>
{/if}
