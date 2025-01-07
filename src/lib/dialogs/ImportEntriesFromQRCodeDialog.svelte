<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
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

  let importedEntries = $state<Entry[]>([]);
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (!importedEntries.length) {
        error = "No input";
        return;
      }

      const addTransaction = transaction("entries", "readwrite");
      const entryStore = addTransaction.objectStore("entries");
      addTransaction.onabort = () => {
        error = "Could not add entries!";
      };

      for (const entry of importedEntries) {
        entryStore.add($state.snapshot(entry));
      }

      addTransaction.oncomplete = () => {
        onimport();
        closeDialog();
      };
    },
  };

  function onread(data: string) {
    if (!data.length) {
      error = "No input";
      return;
    }

    importedEntries = csvToEntries(data, surveyRecord, fields);
  }

  function retry() {
    error = "";
    importedEntries = [];
  }
</script>

<span>Import entries</span>

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
  <Button onclick={retry}>
    <Icon name="arrow-rotate-left" />
    Retry
  </Button>
{:else}
  <QRCodeReader {onread} />
{/if}

{#if error}
  <span>{error}</span>
{/if}
