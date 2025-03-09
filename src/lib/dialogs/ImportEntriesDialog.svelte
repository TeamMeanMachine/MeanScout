<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import QrCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { csvToEntries, importEntries, importEntriesCompressed, type Entry } from "$lib/entry";
  import type { DetailedSingleField } from "$lib/field";
  import { transaction } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
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

  const tab = sessionStorageStore<"qrfcode" | "file">(
    "import-data-tab",
    $cameraStore && DecompressionStream ? "qrfcode" : "file",
  );

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

    const allFiles = await Promise.all(
      [...files].map(async (file) => {
        return { type: file.type, data: await file.text() };
      }),
    );

    for (const { type, data } of allFiles) {
      if (type == "text/csv") {
        importedEntries.push(...csvToEntries(data, surveyRecord, fields));
      } else {
        const result = importEntries(surveyRecord, data);
        if (!result.success) {
          error = result.error;
          return;
        }
        importedEntries.push(...result.entries);
      }
    }
  }

  async function onread(data: Uint8Array) {
    if (!data.length) {
      error = "No input";
      return;
    }

    const result = await importEntriesCompressed(surveyRecord, data);
    if (!result.success) {
      error = result.error;
      return;
    }

    importedEntries = result.entries;
  }

  function retry() {
    error = "";
    importedEntries = [];
  }
</script>

<span>Import entries</span>

{#if $cameraStore && DecompressionStream}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
{/if}

{#if $tab == "qrfcode" && $cameraStore && DecompressionStream}
  {#if importedEntries.length}
    {@render preview()}

    <Button onclick={retry}>
      <Icon name="arrow-rotate-left" />
      Retry
    </Button>
  {:else}
    <QrCodeReader {onread} />
  {/if}
{:else}
  <input
    type="file"
    accept=".csv,.json,.txt"
    bind:files
    {onchange}
    class="file:text-theme file:mr-3 file:border-none file:bg-neutral-800 file:p-2"
  />

  {#if importedEntries.length}
    {@render preview()}
  {/if}
{/if}

{#snippet preview()}
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
{/snippet}

{#if error}
  <span>{error}</span>
{/if}
