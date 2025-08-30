<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryCount,
  }: {
    surveyRecord: Survey;
    entryCount: number;
  } = $props();

  let error = $state("");

  export const { onopen, onconfirm }: DialogExports = {
    onconfirm() {
      const entryCursorRequest = idb.objectStore("entries", "readwrite").index("surveyId").openCursor(surveyRecord.id);
      entryCursorRequest.onerror = () => {
        error = `Could not delete entries: ${entryCursorRequest.error?.message}`;
      };

      entryCursorRequest.onsuccess = () => {
        const cursor = entryCursorRequest.result;
        if (cursor === undefined) {
          error = "Could not delete entries";
          return;
        }

        if (cursor === null) {
          closeDialog();
          return;
        }

        cursor.delete();
        cursor.continue();
      };
    },
  };
</script>

<span>Delete all entries for "{surveyRecord.name}"?</span>

{#if entryCount}
  <span>{entryCount} {entryCount > 1 ? "entries" : "entry"} will be lost!</span>
{/if}

{#if error}
  <span>{error}</span>
{/if}
