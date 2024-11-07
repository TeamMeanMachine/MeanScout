<script lang="ts">
  import { parseValueFromString } from "$lib";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import { transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    onimport,
  }: {
    surveyRecord: IDBRecord<Survey>;
    onimport?: () => void;
  } = $props();

  let files = $state<FileList | undefined>();
  let importedEntries: IDBRecord<Entry>[] = [];
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (!files?.length) {
        error = "No input";
        return;
      }

      const allFiles = await Promise.all([...files].map((file) => file.text()));
      const csv = allFiles
        .join("\n")
        .split("\n")
        .map((line) =>
          line
            .trim()
            .split(",")
            .map((value) => value.trim()),
        );

      if (!csv.length || !csv[0].length) {
        error = "No input";
        return;
      }

      const addTransaction = transaction("entries", "readwrite");
      const entryStore = addTransaction.objectStore("entries");
      addTransaction.onabort = () => {
        error = "Could not add entries!";
      };

      for (const entryCSV of csv) {
        if (entryCSV[0] == "Team") continue;
        addEntry(entryCSV, entryStore);
      }

      addTransaction.oncomplete = () => {
        onimport?.();
        closeDialog();
      };
    },
  };

  function addEntry(entryCSV: string[], entryStore: IDBObjectStore) {
    let entry: Entry;
    if (surveyRecord.type == "match") {
      entry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "exported",
        team: entryCSV[0],
        match: parseInt(entryCSV[1]),
        absent: entryCSV[2].toLowerCase() == "true" ? true : false,
        values: entryCSV.slice(3).map(parseValueFromString),
        created: new Date(),
        modified: new Date(),
      };
    } else {
      entry = {
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "exported",
        team: entryCSV[0],
        values: entryCSV.slice(1).map(parseValueFromString),
        created: new Date(),
        modified: new Date(),
      };
    }

    const addRequest = entryStore.add(entry);
    addRequest.onerror = (e) => e.preventDefault();
    addRequest.onsuccess = () => {
      const id = addRequest.result;
      if (typeof id != "number") return;
      importedEntries = [{ id, ...entry }, ...importedEntries];
    };
  }
</script>

<span>Import entries</span>

<input
  type="file"
  accept=".csv"
  bind:files
  class="file:mr-3 file:border-none file:bg-neutral-800 file:p-2 file:text-theme"
/>

{#if error}
  <span>{error}</span>
{/if}
