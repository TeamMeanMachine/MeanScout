<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { csvToEntries, type Entry } from "$lib/entry";
  import type { DetailedSingleField } from "$lib/field";
  import { transaction } from "$lib/idb";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    fields,
    onimport,
  }: {
    surveyRecord: IDBRecord<Survey>;
    fields: DetailedSingleField[];
    onimport: () => void;
  } = $props();

  let files = $state<FileList | undefined>();
  let importedEntries = $state<Entry[]>([]);
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (!importedEntries.length) {
        error = "No input";
        return;
      }

      const addTransaction = transaction("entries", "readwrite");
      addTransaction.onabort = () => {
        error = "Could not add entries!";
      };

      const entryStore = addTransaction.objectStore("entries");
      for (const entry of importedEntries) {
        entryStore.add($state.snapshot(entry));
      }

      addTransaction.oncomplete = () => {
        onimport();
        closeDialog();
      };
    },
  };

  async function onchange() {
    if (!files?.length) {
      return;
    }

    const allFiles = await Promise.all([...files].map((file) => file.text()));
    const csv = allFiles.join("\n");

    if (!csv.length || !csv[0].length) {
      error = "No input";
      return;
    }

    importedEntries = csvToEntries(csv, surveyRecord, fields);
  }
</script>

<span>Import entries</span>

<input
  type="file"
  accept=".csv"
  bind:files
  {onchange}
  class="file:mr-3 file:border-none file:bg-neutral-800 file:p-2 file:text-theme"
/>

{#if importedEntries.length}
  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto">
    <table class="w-full text-left">
      <thead>
        <tr>
          <th class="w-0 p-2">Team</th>
          {#if surveyRecord.type == "match"}
            <th class="w-0 p-2">Match</th>
            <th class="w-0 p-2">Absent</th>
          {/if}
          <td></td>
        </tr>
      </thead>
      <tbody>
        {#each importedEntries as entry}
          <tr>
            <td class="p-2">{entry.team}</td>
            {#if entry.type == "match"}
              <td class="p-2">{entry.match}</td>
              <td class="p-2">{entry.absent}</td>
            {/if}
            <td></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <span>Entries: {importedEntries.length}</span>
{/if}

{#if error}
  <span>{error}</span>
{/if}
