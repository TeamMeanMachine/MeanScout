<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { objectStore } from "$lib/idb";

  let {
    entryRecord,
    ondelete,
  }: {
    entryRecord: IDBRecord<Entry>;
    ondelete: () => void;
  } = $props();

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      const deleteRequest = objectStore("entries", "readwrite").delete(entryRecord.id);
      deleteRequest.onerror = () => {
        error = `Could not delete entry: ${deleteRequest.error?.message}`;
      };

      deleteRequest.onsuccess = () => {
        ondelete();
        closeDialog();
      };
    },
  };
</script>

<span>Delete this entry?</span>
{#if error}
  <span>{error}</span>
{/if}
