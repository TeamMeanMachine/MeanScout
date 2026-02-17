<script lang="ts">
  import { CheckIcon, CircleCheckBigIcon, CircleIcon, DownloadIcon, Undo2Icon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { compareMatches, rerunOtherContextLoads, schemaVersion, sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { openDialog } from "$lib/dialog";
  import HandleRtcResponseMessageDialog from "$lib/dialogs/HandleRtcResponseMessageDialog.svelte";
  import type { Entry, TbaMetrics } from "$lib/entry";
  import { idb } from "$lib/idb";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { cameraStore } from "$lib/settings";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const tab = sessionStorageStore<"room" | "qrfcode" | "file">("export-data-tab", "room");
  const duplicateFixMethod = sessionStorageStore<"overwrite" | "ignore">("import-duplicate-fix-method", "overwrite");

  let files = $state<FileList | undefined>();
  let importedEntries = $state<Entry[]>([]);
  let error = $state("");

  let duplicateIds = $derived.by(() => {
    const duplicates = new Set<string>();

    for (const entry of importedEntries) {
      if (data.entryRecords.some((e) => e.id == entry.id)) {
        duplicates.add(entry.id);
      }
    }

    return duplicates;
  });

  function save() {
    if (!importedEntries.length) {
      error = "No input";
      return;
    }

    const addTransaction = idb.transaction("entries", "readwrite");
    addTransaction.onabort = () => {
      error = "Could not add entries!";
    };

    addTransaction.objectStore("comps").put({ ...$state.snapshot(data.compRecord), modified: new Date() });

    addTransaction.oncomplete = () => {
      rerunOtherContextLoads();
      goto(`#/comp/${data.compRecord.id}`, { invalidateAll: true });
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

      const existingEntry = data.entryRecords.find((e) => e.id == importedEntry.id);

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
  }

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
    if (!data.surveyRecords.some((survey) => survey.id == jsonEntry.surveyId)) {
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

      if (jsonEntry.matchSet && jsonEntry.matchSet > 1) {
        entry.matchSet = jsonEntry.matchSet;
      }

      if (jsonEntry.matchLevel && jsonEntry.matchLevel != "qm") {
        entry.matchLevel = jsonEntry.matchLevel;
      }

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
      if (jsonEntry.scoutTeam) {
        entry.scoutTeam = jsonEntry.scoutTeam;
      }
    }

    return entry;
  }

  function sortEntries(a: Entry, b: Entry) {
    const teamCompare = a.team.localeCompare(b.team, "en", { numeric: true });
    const matchCompare = a.type == "match" && b.type == "match" ? compareMatches(b, a) : 0;
    const scoutCompare = a.scout?.localeCompare(b.scout || "") || 0;
    return matchCompare || teamCompare || scoutCompare;
  }

  function retry() {
    error = "";
    importedEntries = [];
  }

  function requestFromAll() {
    if (!onlineTransfer.localId) return;
    onlineTransfer.sendToAll({ type: "request", request: "entries" });
  }

  function requestFrom(id: string) {
    if (!onlineTransfer.localId) return;
    onlineTransfer.sendTo(id, { type: "request", request: "entries" });
  }
</script>

<div class="mt-[57px] grow overflow-x-hidden px-3 py-6 max-lg:mb-[65px] lg:ml-80">
  <div class="mx-auto flex max-w-[516px] flex-col space-y-6">
    <div class="flex flex-col gap-3">
      <div class="flex flex-col">
        <h2 class="font-bold">Receive</h2>
        <span class="text-xs font-light">Entries</span>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button
          onclick={() => ($tab = "room")}
          class={["grow basis-0 flex-col items-start gap-0!", $tab == "room" ? "font-bold" : "font-light"]}
        >
          {#if !onlineTransfer.localId}
            Join room
          {:else}
            Room
          {/if}
          <span class="text-xs font-light">Online</span>
        </Button>
        <Button
          onclick={() => ($tab = "qrfcode")}
          class={["grow basis-0 flex-col items-start gap-0!", $tab == "qrfcode" ? "font-bold" : "font-light"]}
        >
          QRF code
          <span class="text-xs font-light">Offline</span>
        </Button>
        <Button
          onclick={() => ($tab = "file")}
          class={["grow basis-0 flex-col items-start gap-0!", $tab == "file" ? "font-bold" : "font-light"]}
        >
          File
          <span class="text-xs font-light">Import</span>
        </Button>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      {#if $tab == "room"}
        {#each onlineTransfer.rtcMessages.filter((m) => m.type == "response") as message}
          {@const client = (message.from ? onlineTransfer.clients.get(message.from) : undefined) || {
            info: { id: "", name: "Disconnected" },
          }}

          <Button
            onclick={() => {
              openDialog(HandleRtcResponseMessageDialog, {
                message,
                client: client.info,
                existing: {
                  comps: [data.compRecord],
                  surveys: data.surveyRecords,
                  fields: data.fieldRecords,
                  entries: data.entryRecords,
                },
                onhandle(action) {
                  onlineTransfer.clearRtcMessage(message);
                },
              });
            }}
            class="flex-col items-start gap-1!"
          >
            <span>From: {client.info.name} {client.info.team ? `(${client.info.team})` : ""}</span>

            {#if message.comps?.length}
              <span>Comps: {message.comps?.length}</span>
            {/if}

            {#if message.surveys?.length}
              <span>Surveys: {message.surveys?.length}</span>
            {/if}

            {#if message.fields?.length}
              <span>Fields: {message.fields?.length}</span>
            {/if}

            {#if message.entries?.length}
              <span>Entries: {message.entries?.length}</span>
            {/if}
          </Button>
        {/each}

        {#if onlineTransfer.remoteClients.length}
          <Button onclick={requestFromAll}>
            <DownloadIcon class="text-theme" />
            Request from everyone
          </Button>

          <div class="flex flex-col">
            <span class="text-sm font-light">Request from</span>

            <div class="flex flex-col gap-2">
              {#each onlineTransfer.remoteClients as client (client.info.id)}
                <Button onclick={() => requestFrom(client.info.id)}>
                  <DownloadIcon class="size-5 text-theme" />
                  <span>
                    {client.info.name}
                    {#if client.info.team}
                      <span class="text-xs font-light">({client.info.team})</span>
                    {/if}
                  </span>
                </Button>
              {/each}
            </div>
          </div>
        {:else}
          <RoomWidget />
        {/if}
      {:else if $tab == "qrfcode" && $cameraStore}
        {#if importedEntries.length}
          <Button onclick={retry}>
            <Undo2Icon class="text-theme" />
            Retry
          </Button>
        {:else}
          <QRCodeReader {onread} />
        {/if}
      {:else}
        <input
          type="file"
          accept=".json,.txt"
          bind:files
          {onchange}
          class="file:mr-3 file:border-none file:bg-neutral-800 file:p-2 file:text-theme"
        />
      {/if}

      {#if $tab != "room" && importedEntries.length}
        Entries: {importedEntries.length}

        {#if duplicateIds.size}
          <div class="flex flex-col">
            <span>Duplicates: {duplicateIds.size}<span class="text-xs font-light">/{importedEntries.length}</span></span
            >
            <div class="flex flex-wrap gap-2">
              <Button
                onclick={() => ($duplicateFixMethod = "overwrite")}
                class={["grow basis-52", $duplicateFixMethod == "overwrite" ? "font-bold" : "font-light"]}
              >
                {#if $duplicateFixMethod == "overwrite"}
                  <CircleCheckBigIcon class="text-theme" />
                {:else}
                  <CircleIcon class="text-theme" />
                {/if}
                Overwrite
              </Button>
              <Button
                onclick={() => ($duplicateFixMethod = "ignore")}
                class={["grow basis-52", $duplicateFixMethod == "ignore" ? "font-bold" : "font-light"]}
              >
                {#if $duplicateFixMethod == "ignore"}
                  <CircleCheckBigIcon class="text-theme" />
                {:else}
                  <CircleIcon class="text-theme" />
                {/if}
                Ignore
              </Button>
            </div>
          </div>
        {/if}

        <Button onclick={save}>
          <CheckIcon class="text-theme" />
          <div class="flex flex-col">
            Save
            <span class="text-xs font-light"></span>
          </div>
        </Button>

        <div class="flex flex-col gap-2">
          <table class="w-full text-left">
            <thead>
              <tr>
                <th class="w-0 p-2 text-center">Team</th>
                {#if data.surveyRecords.some((survey) => survey.type == "match")}
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
                  {#if data.surveyRecords.some((survey) => survey.type == "match")}
                    <td class="p-2 text-center">
                      {#if entry.type == "match" && entry.matchLevel && entry.matchLevel != "qm"}
                        {entry.matchLevel}{entry.matchSet || 1}-{entry.match}
                      {:else if entry.type == "match"}
                        {entry.match}
                      {/if}
                    </td>
                    <td class="p-2 text-center">{entry.type == "match" ? entry.absent || "" : ""}</td>
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
      {/if}

      {#if error}
        <span>{error}</span>
      {/if}
    </div>
  </div>
</div>
