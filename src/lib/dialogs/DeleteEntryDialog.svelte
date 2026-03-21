<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { idb } from "$lib/idb";

  let {
    entryRecord,
    ondelete,
  }: {
    entryRecord: Entry;
    ondelete: () => void;
  } = $props();

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      const deleteRequest = idb.delete("entries", entryRecord.id);
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

<span>Are you sure you want to <span class="font-bold">delete this entry?</span></span>

<span class="text-sm font-light">
  This only affects your device. If you've already shared this entry, other devices may have a copy.
</span>

{#if error}
  <span>{error}</span>
{/if}
