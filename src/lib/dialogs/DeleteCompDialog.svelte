<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Comp } from "$lib/comp";
  import type { DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";

  let {
    compRecord,
    surveyCount,
  }: {
    compRecord: Comp;
    surveyCount: number;
  } = $props();

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      const deleteTransaction = idb.transaction(["comps", "surveys", "fields", "entries"], "readwrite");
      deleteTransaction.onabort = () => {
        error ||= `Could not delete comp: ${deleteTransaction.error?.message}`;
      };

      deleteTransaction.oncomplete = () => {
        goto(`#/`);
      };

      const compRequest = deleteTransaction.objectStore("comps").delete(compRecord.id);
      compRequest.onerror = () => {
        error = `Could not delete comp: ${compRequest.error?.message}`;
        deleteTransaction.abort();
      };

      const surveyCursorRequest = deleteTransaction.objectStore("surveys").index("compId").openCursor(compRecord.id);
      surveyCursorRequest.onerror = () => {
        error = `Could not delete comp's surveys: ${surveyCursorRequest.error?.message}`;
        deleteTransaction.abort();
      };

      surveyCursorRequest.onsuccess = () => {
        const cursor = surveyCursorRequest.result;
        if (cursor === undefined) {
          error = "Could not delete comp's surveys";
          deleteTransaction.abort();
          return;
        }

        if (cursor === null) {
          return;
        }

        deleteSurveyEntries(cursor.value.id, deleteTransaction);
        deleteSurveyFields(cursor.value.id, deleteTransaction);

        cursor.delete();
        cursor.continue();
      };
    },
  };

  function deleteSurveyEntries(surveyId: number, deleteTransaction: IDBTransaction) {
    const entryCursorRequest = deleteTransaction.objectStore("entries").index("surveyId").openCursor(surveyId);
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
  }

  function deleteSurveyFields(surveyId: number, deleteTransaction: IDBTransaction) {
    const fieldCursorRequest = deleteTransaction.objectStore("fields").index("surveyId").openCursor(surveyId);
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
  }
</script>

<span>Delete "{compRecord.name}"?</span>

{#if surveyCount}
  <span>{surveyCount} {surveyCount > 1 ? "surveys" : "survey"} will be lost!</span>
{/if}

{#if error}
  <span>{error}</span>
{/if}
