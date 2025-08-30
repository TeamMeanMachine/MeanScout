<script lang="ts">
  import { goto } from "$app/navigation";
  import type { DialogExports } from "$lib/dialog";
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

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      const deleteTransaction = idb.transaction(["surveys", "fields", "entries"], "readwrite");
      deleteTransaction.onabort = () => {
        error ||= `Could not delete survey: ${deleteTransaction.error?.message}`;
      };

      deleteTransaction.oncomplete = () => {
        goto(`#/comp/${surveyRecord.compId}`);
      };

      const surveyRequest = deleteTransaction.objectStore("surveys").delete(surveyRecord.id);
      surveyRequest.onerror = () => {
        error = `Could not delete survey: ${surveyRequest.error?.message}`;
        deleteTransaction.abort();
      };

      const entryCursorRequest = deleteTransaction.objectStore("entries").index("surveyId").openCursor(surveyRecord.id);
      entryCursorRequest.onerror = () => {
        error = `Could not delete survey's entries: ${entryCursorRequest.error?.message}`;
        deleteTransaction.abort();
      };

      entryCursorRequest.onsuccess = () => {
        const cursor = entryCursorRequest.result;
        if (cursor === undefined) {
          error = "Could not delete survey's entries";
          deleteTransaction.abort();
          return;
        }

        if (cursor === null) {
          return;
        }

        cursor.delete();
        cursor.continue();
      };

      const fieldCursorRequest = deleteTransaction.objectStore("fields").index("surveyId").openCursor(surveyRecord.id);
      fieldCursorRequest.onerror = () => {
        error = `Could not delete survey's fields: ${fieldCursorRequest.error?.message}`;
        deleteTransaction.abort();
      };

      fieldCursorRequest.onsuccess = () => {
        const cursor = fieldCursorRequest.result;
        if (cursor === undefined) {
          error = "Could not delete survey's fields";
          deleteTransaction.abort();
          return;
        }

        if (cursor === null) {
          return;
        }

        cursor.delete();
        cursor.continue();
      };
    },
  };
</script>

<span>Delete "{surveyRecord.name}"?</span>

{#if entryCount}
  <span>{entryCount} {entryCount > 1 ? "entries" : "entry"} will be lost!</span>
{/if}

{#if error}
  <span>{error}</span>
{/if}
