<script lang="ts">
  import { parseValueFromString } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
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
        const addRequest = entryStore.add(entry);
        addRequest.onerror = (e) => e.preventDefault();
        addRequest.onsuccess = () => {
          const id = addRequest.result;
          if (typeof id != "number") return;
        };
      }

      addTransaction.oncomplete = () => {
        onimport?.();
        closeDialog();
      };
    },
  };

  function onread(data: string) {
    const csv = data.split("\n").map((line) => {
      return line
        .trim()
        .split(",")
        .map((value) => value.trim());
    });

    if (!csv.length || !csv[0].length) {
      error = "No input";
      return;
    }

    importedEntries = csv.map((entryCSV) => {
      if (surveyRecord.type == "match") {
        return {
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
        return {
          surveyId: surveyRecord.id,
          type: surveyRecord.type,
          status: "exported",
          team: entryCSV[0],
          values: entryCSV.slice(1).map(parseValueFromString),
          created: new Date(),
          modified: new Date(),
        };
      }
    });
  }

  function retry() {
    error = "";
    importedEntries = [];
  }
</script>

<span>Import from QR code</span>

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
