<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { objectStore } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecord,
    ondelete,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entryRecord: IDBRecord<Entry>;
    ondelete?: (() => void) | undefined;
  } = $props();

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      const deleteRequest = objectStore("entries", "readwrite").delete(entryRecord.id);
      deleteRequest.onerror = () => {
        error = `Could not delete entry: ${deleteRequest.error?.message}`;
      };

      deleteRequest.onsuccess = () => {
        surveyRecord.modified = new Date();
        ondelete?.();
        closeDialog();
      };
    },
  };
</script>

<span>Delete this entry?</span>
{#if error}
  <span>{error}</span>
{/if}
