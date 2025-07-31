<script lang="ts">
  import { schemaVersion, sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QrCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { type Entry, type TbaMetrics } from "$lib/entry";
  import { idb } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import { CircleCheckBigIcon, CircleIcon, Undo2Icon } from "@lucide/svelte";

  let {
    surveyRecord,
    existingEntries,
    onimport,
  }: {
    surveyRecord: Survey;
    existingEntries: Entry[];
    onimport: () => void;
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("import-data-tab", $cameraStore ? "qrfcode" : "file");
  const duplicateFixMethod = sessionStorageStore<"overwrite" | "ignore">("import-duplicate-fix-method", "overwrite");

  let files = $state<FileList | undefined>();
  let importedEntries = $state<Entry[]>([]);
  let error = $state("");

  let duplicateIds = $derived.by(() => {
    const duplicates = new Set<string>();

    for (const entry of importedEntries) {
      if (existingEntries.some((e) => e.id == entry.id)) {
        duplicates.add(entry.id);
      }
    }

    return duplicates;
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

      if (!duplicateIds.size) {
        for (const entry of importedEntries) {
          entryStore.put($state.snapshot(entry));
        }
        return;
      }

      for (const importedEntry of importedEntries) {
        if (!duplicateIds.has(importedEntry.id)) {
          entryStore.put($state.snapshot(importedEntry));
          continue;
        }

        const existingEntry = existingEntries.find((e) => e.id == importedEntry.id);

        if (!existingEntry) {
          entryStore.put($state.snapshot(importedEntry));
          continue;
        }

        const tbaMetrics: TbaMetrics = [];

        if (existingEntry?.type == "match") {
          for (const metric of existingEntry.tbaMetrics || []) {
            tbaMetrics.push($state.snapshot(metric));
          }
        }

        if (importedEntry.type == "match") {
          for (const metric of importedEntry.tbaMetrics || []) {
            const metricIndex = tbaMetrics.findIndex((m) => m.name == metric.name);
            if (metricIndex !== -1 && $duplicateFixMethod == "overwrite") {
              tbaMetrics[metricIndex].value = $state.snapshot(metric).value;
            } else {
              tbaMetrics.push($state.snapshot(metric));
            }
          }
        }

        let newEntry =
          $duplicateFixMethod == "overwrite" ? $state.snapshot(importedEntry) : $state.snapshot(existingEntry);

        if (tbaMetrics.length) {
          entryStore.put({ ...newEntry, tbaMetrics });
        } else {
          entryStore.put(newEntry);
        }
      }
    },
  };

  async function onchange() {
    if (!files?.length) {
      return;
    }

    onread(await files[0].text());
  }

  function onread(data: string) {
    retry();

    let json: {
      version: number;
      entries: Entry[];
    };

    try {
      json = JSON.parse(data);
    } catch (e) {
      console.error("JSON failed to parse imported entries:", data);
      error = "JSON failed to parse";
      return;
    }

    if (json.version < schemaVersion) {
      error = "Outdated version";
      return;
    } else if (json.version > schemaVersion) {
      error = "Unsupported version";
      return;
    }

    importedEntries = json.entries
      .map(parseJsonEntry)
      .filter((entry) => entry !== undefined)
      .toSorted(sortEntries);
  }

  function parseJsonEntry(jsonEntry: Entry) {
    if (jsonEntry.surveyId != surveyRecord.id) {
      return;
    }

    let entry: Entry;

    if ("match" in jsonEntry) {
      entry = {
        id: jsonEntry.id,
        surveyId: jsonEntry.surveyId,
        type: "match",
        status: "exported",
        team: jsonEntry.team,
        match: jsonEntry.match,
        absent: jsonEntry.absent,
        values: jsonEntry.values,
        created: new Date(),
        modified: new Date(),
      };

      if (jsonEntry.tbaMetrics) {
        entry.tbaMetrics = jsonEntry.tbaMetrics;
      }

      if (jsonEntry.scout && jsonEntry.prediction) {
        entry.prediction = jsonEntry.prediction;
        if (jsonEntry.predictionReason) {
          entry.predictionReason = jsonEntry.predictionReason;
        }
      }
    } else {
      entry = {
        id: jsonEntry.id,
        surveyId: jsonEntry.surveyId,
        type: "pit",
        status: "exported",
        team: jsonEntry.team,
        values: jsonEntry.values,
        created: new Date(),
        modified: new Date(),
      };
    }

    if (jsonEntry.scout) {
      entry.scout = jsonEntry.scout;
    }

    return entry;
  }

  function sortEntries(a: Entry, b: Entry) {
    const teamCompare = a.team.localeCompare(b.team, "en", { numeric: true });
    const matchCompare = a.type == "match" && b.type == "match" ? b.match - a.match : 0;
    const scoutCompare = a.scout?.localeCompare(b.scout || "") || 0;
    return matchCompare || teamCompare || scoutCompare;
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
    accept=".json,.txt"
    bind:files
    {onchange}
    class="file:text-theme file:mr-3 file:border-none file:bg-neutral-800 file:p-2"
  />
{/if}

{#if importedEntries.length}
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
          {#if duplicateIds.size}
            <th class="w-0 p-2">Duplicate</th>
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
            {#if duplicateIds.size}
              <td class="p-2">
                {#if duplicateIds.has(entry.id)}
                  Yes
                {/if}
              </td>
            {/if}
            <td></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if duplicateIds.size}
    <div class="flex flex-col">
      <span>Duplicates</span>
      <div class="flex flex-wrap gap-2">
        <Button
          onclick={() => ($duplicateFixMethod = "overwrite")}
          class="grow basis-52 {$duplicateFixMethod == 'overwrite' ? 'font-bold' : 'font-light'}"
        >
          {#if $duplicateFixMethod == "overwrite"}
            <CircleCheckBigIcon class="text-theme" />
          {:else}
            <CircleIcon class="text-theme" />
          {/if}
          Overwrite {duplicateIds.size}
        </Button>
        <Button
          onclick={() => ($duplicateFixMethod = "ignore")}
          class="grow basis-52 {$duplicateFixMethod == 'ignore' ? 'font-bold' : 'font-light'}"
        >
          {#if $duplicateFixMethod == "ignore"}
            <CircleCheckBigIcon class="text-theme" />
          {:else}
            <CircleIcon class="text-theme" />
          {/if}
          Ignore {duplicateIds.size}
        </Button>
      </div>
    </div>
  {/if}
{/if}

{#if error}
  <span>{error}</span>
{/if}
