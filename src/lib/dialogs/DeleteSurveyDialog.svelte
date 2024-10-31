<script lang="ts">
  import type { DialogExports } from "$lib/dialog";
  import { objectStore, transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
  }: {
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  let entryCount = $state(0);
  let error = $state("");

  export const { onopen, onconfirm }: DialogExports = {
    onopen(open) {
      const entryCountRequest = objectStore("entries").index("surveyId").count(surveyRecord.id);
      entryCountRequest.onerror = () => open();

      entryCountRequest.onsuccess = () => {
        if (typeof entryCountRequest.result == "number") {
          entryCount = entryCountRequest.result;
        }
        open();
      };
    },
    onconfirm() {
      const deleteTransaction = transaction(["surveys", "entries"], "readwrite");
      deleteTransaction.onabort = () => {
        error ||= `Could not delete survey: ${deleteTransaction.error?.message}`;
      };

      deleteTransaction.oncomplete = () => {
        location.hash = "/";
      };

      const surveyRequest = deleteTransaction.objectStore("surveys").delete(surveyRecord.id);
      surveyRequest.onerror = () => {
        error = `Could not delete survey: ${surveyRequest.error?.message}`;
        deleteTransaction.abort();
      };

      const cursorRequest = deleteTransaction.objectStore("entries").index("surveyId").openCursor(surveyRecord.id);
      cursorRequest.onerror = () => {
        error = `Could not delete survey's entries: ${cursorRequest.error?.message}`;
        deleteTransaction.abort();
      };

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
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
