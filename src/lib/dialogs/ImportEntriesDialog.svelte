<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QrCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { csvToEntries, importEntries, type Entry, type MatchEntry } from "$lib/entry";
  import type { SingleFieldWithDetails } from "$lib/field";
  import { idb } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import { CircleCheckBigIcon, CircleIcon, Undo2Icon } from "@lucide/svelte";

  let {
    surveyRecord,
    orderedSingleFields,
    existingEntries,
    onimport,
  }: {
    surveyRecord: IDBRecord<Survey>;
    orderedSingleFields: SingleFieldWithDetails[];
    existingEntries: IDBRecord<Entry>[];
    onimport: () => void;
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("import-data-tab", $cameraStore ? "qrfcode" : "file");
  const duplicateFixMethod = sessionStorageStore<"overwrite" | "ignore">("import-duplicate-fix-method", "overwrite");

  let files = $state<FileList | undefined>();
  let importedEntries = $state<Entry[]>([]);
  let error = $state("");

  function getEntryUniqueString(entry: MatchEntry) {
    return `${entry.match}_${entry.team}`;
  }

  let duplicateEntryStringsAndIds = $derived.by(() => {
    const output = new Map<string, number>();

    if (surveyRecord.type != "match") {
      return output;
    }

    for (const entry of importedEntries) {
      if (entry.type != "match") {
        continue;
      }

      const uniqueString = getEntryUniqueString(entry);

      const existingEntry = existingEntries.find((e) => e.type == "match" && uniqueString == getEntryUniqueString(e));
      if (existingEntry) {
        output.set(uniqueString, $state.snapshot(existingEntry).id);
      }
    }

    return output;
  });

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (!importedEntries.length) {
        error = "No input";
        return;
      }

      const addTransaction = idb.transaction("entries", "readwrite");
      addTransaction.onabort = () => {
        error = "Could not add entries!";
      };

      addTransaction.oncomplete = () => {
        onimport();
        closeDialog();
      };

      const entryStore = addTransaction.objectStore("entries");

      if (!duplicateEntryStringsAndIds.size) {
        for (const entry of importedEntries) {
          entryStore.add($state.snapshot(entry));
        }
        return;
      }

      for (const entry of importedEntries) {
        if (entry.type != "match") {
          entryStore.add($state.snapshot(entry));
          continue;
        }

        const uniqueString = getEntryUniqueString(entry);

        const matchingEntryId = duplicateEntryStringsAndIds.get(uniqueString);

        if (!matchingEntryId) {
          entryStore.add($state.snapshot(entry));
          continue;
        }

        const matchingEntry = existingEntries.find((e) => e.id == matchingEntryId);
        const tbaMetrics =
          matchingEntry?.type == "match" && matchingEntry.tbaMetrics?.length
            ? $state.snapshot(matchingEntry).tbaMetrics
            : $state.snapshot(entry).tbaMetrics;

        if ($duplicateFixMethod == "overwrite") {
          entryStore.put({ ...$state.snapshot(entry), id: matchingEntryId, tbaMetrics });
          continue;
        }

        if ($duplicateFixMethod == "ignore" && tbaMetrics) {
          entryStore.put({ ...$state.snapshot(matchingEntry), tbaMetrics });
        }
      }
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
        importedEntries.push(...csvToEntries(data, surveyRecord, orderedSingleFields));
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

  function onread(data: string) {
    if (!data.length) {
      error = "No input";
      return;
    }

    const result = importEntries(surveyRecord, data);
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

{#if $cameraStore}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
{/if}

{#if $tab == "qrfcode" && $cameraStore}
  {#if importedEntries.length}
    {@render preview()}

    <Button onclick={retry}>
      <Undo2Icon class="text-theme" />
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
          <td colspan="2" class="w-0 p-2 text-nowrap">Entries: {importedEntries.length}</td>
        </tr>
        <tr>
          <th class="w-0 p-2 text-center">Team</th>
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
            <td class="p-2 text-center">{entry.team}</td>
            {#if entry.type == "match"}
              <td class="p-2 text-center">{entry.match}</td>
              <td class="p-2 text-center">{entry.absent || ""}</td>
            {/if}
            <td></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if duplicateEntryStringsAndIds.size}
    <div class="flex flex-col">
      <span>Duplicates</span>
      <div class="flex flex-wrap gap-2">
        <Button
          onclick={() => {
            $duplicateFixMethod = "overwrite";
          }}
          class="grow basis-52 {$duplicateFixMethod == 'overwrite' ? 'font-bold' : 'font-light'}"
        >
          {#if $duplicateFixMethod == "overwrite"}
            <CircleCheckBigIcon class="text-theme" />
          {:else}
            <CircleIcon class="text-theme" />
          {/if}
          Overwrite {duplicateEntryStringsAndIds.size}
        </Button>
        <Button
          onclick={() => {
            $duplicateFixMethod = "ignore";
          }}
          class="grow basis-52 {$duplicateFixMethod == 'ignore' ? 'font-bold' : 'font-light'}"
        >
          {#if $duplicateFixMethod == "ignore"}
            <CircleCheckBigIcon class="text-theme" />
          {:else}
            <CircleIcon class="text-theme" />
          {/if}
          Ignore {duplicateEntryStringsAndIds.size}
        </Button>
      </div>
    </div>
  {/if}
{/snippet}

{#if error}
  <span>{error}</span>
{/if}
