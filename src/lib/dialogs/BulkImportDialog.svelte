<script lang="ts">
  import { DownloadIcon, RefreshCwIcon, SquareCheckBigIcon, SquareIcon, Undo2Icon, XIcon } from "@lucide/svelte";
  import { rerunAllContextLoads, sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ImportViewer from "$lib/components/ImportViewer.svelte";
  import QrCodeReader from "$lib/components/QRCodeReader.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { AllData } from "$lib/idb";
  import { importData, importSchema, type ImportedData } from "$lib/import.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { z } from "zod";
  import HandleRtcResponseMessageDialog from "./HandleRtcResponseMessageDialog.svelte";

  let {
    existing,
    request,
  }: {
    existing: AllData;
    request: "entries" | "configs" | "all";
  } = $props();

  const storedTab = sessionStorageStore<"room" | "qrfcode" | "file">(
    "import-data-tab",
    navigator.onLine ? "room" : "qrfcode",
  );
  let currentTab = $state(onlineTransfer.requestsFromClients.size ? "room" : $storedTab);

  let imported = $state<ImportedData>({});
  let overwriteDuplicateEntries = $state(true);
  let files = $state<FileList | undefined>();
  let error = $state("");

  const anyImported = $derived.by(() => {
    return imported.comps?.length || imported.surveys?.length || imported.fields?.length || imported.entries?.length;
  });

  const importedIds = $derived({
    comps: new Set(imported.comps?.map((c) => c.id)),
    surveys: new Set(imported.surveys?.map((s) => s.id)),
    fields: new Set(imported.fields?.map((f) => f.id)),
    entries: new Set(imported.entries?.map((e) => e.id)),
  });

  const existingIds = $derived({
    comps: new Set(existing.comps.map((c) => c.id)),
    surveys: new Set(existing.surveys.map((s) => s.id)),
    fields: new Set(existing.fields.map((f) => f.id)),
    entries: new Set(existing.entries.map((e) => e.id)),
  });

  const duplicateIds = $derived({
    comps: importedIds.comps.intersection(existingIds.comps),
    surveys: importedIds.surveys.intersection(existingIds.surveys),
    fields: importedIds.fields.intersection(existingIds.fields),
    entries: importedIds.entries.intersection(existingIds.entries),
  });

  // svelte-ignore state_referenced_locally
  let displayedDataFromClients = $state($state.snapshot(onlineTransfer.dataFromClients));
  let displayedClients = $state($state.snapshot(onlineTransfer.clients));

  const clientsChanged = $derived.by(() => {
    const displayedIds = new Set(displayedClients.map((c) => c.info.id));
    const currentIds = new Set(onlineTransfer.clients.map((c) => c.info.id));

    if (currentIds.symmetricDifference(displayedIds).size) {
      return true;
    }
    return false;
  });

  const dataFromClientsChanged = $derived.by(() => {
    if (displayedDataFromClients.size != onlineTransfer.dataFromClients.size) {
      return true;
    }
    for (const [clientId, actual] of onlineTransfer.dataFromClients) {
      const displayed = displayedDataFromClients.get(clientId);
      if (actual !== displayed) return true;
    }
    for (const [clientId, displayed] of displayedDataFromClients) {
      const actual = onlineTransfer.dataFromClients.get(clientId);
      if (displayed !== actual) return true;
    }
    return false;
  });

  function refreshDisplayed() {
    displayedDataFromClients = $state.snapshot(onlineTransfer.dataFromClients);
    displayedClients = $state.snapshot(onlineTransfer.clients);
  }

  function changeTab(to: "room" | "qrfcode" | "file") {
    error = "";
    currentTab = to;
    $storedTab = to;
    refreshDisplayed();
  }

  async function onchange() {
    if (!files?.length) {
      return;
    }

    onread(await files[0].text());
  }

  function onread(data: string) {
    try {
      const json = JSON.parse(data);
      imported = z.parse(importSchema, json);
    } catch (e) {
      console.error("Failed to parse imported data:", data, e);
      error = "Failed to parse imported data";
      return;
    }
  }

  function retry() {
    error = "";
    imported = {};
  }

  function requestFromAll() {
    if (!onlineTransfer.localId) return;
    onlineTransfer.sendToAll({ type: "request", request });
  }

  function requestFrom(id: string) {
    if (!onlineTransfer.localId) return;
    onlineTransfer.sendTo(id, { type: "request", request });
  }

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (error) {
        return;
      }

      if (!anyImported && currentTab == "room") {
        closeDialog();
        return;
      }

      if (!anyImported) {
        error = "No data from input";
        return;
      }

      importData({ imported, existing, overwriteDuplicateEntries })
        .then(() => {
          rerunAllContextLoads();
          closeDialog();
        })
        .catch((reason) => {
          error = reason;
        });
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Receive {request}</span>

  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => changeTab("room")} class={currentTab == "room" ? "font-bold" : "font-light"}>Room</Button>
    <Button onclick={() => changeTab("qrfcode")} class={currentTab == "qrfcode" ? "font-bold" : "font-light"}>
      QRF code
    </Button>
    <Button onclick={() => changeTab("file")} class={currentTab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
</div>

{#if currentTab == "room"}
  <Button
    onclick={refreshDisplayed}
    class="relative self-start text-sm"
    disabled={!dataFromClientsChanged && !clientsChanged}
  >
    <RefreshCwIcon class="size-5 text-theme" />
    <span class={dataFromClientsChanged || clientsChanged ? "animate-pulse" : ""}>Refresh</span>
    {#if dataFromClientsChanged || clientsChanged}
      <span class="absolute top-0 right-0.5 text-xs font-bold tracking-tighter italic">!</span>
    {/if}
  </Button>

  {#if displayedDataFromClients.size}
    <div class="flex flex-col">
      <span class="text-sm font-light">Incoming data</span>

      <div class="flex flex-col gap-2">
        {#each displayedDataFromClients as [clientId, data]}
          {@const client = onlineTransfer.getClient(clientId)}

          <div class="flex items-stretch gap-1">
            <Button
              onclick={() => {
                openDialog(HandleRtcResponseMessageDialog, {
                  data,
                  client: client?.info || { id: "", name: "Disconnected" },
                  existing,
                  onhandle() {
                    onlineTransfer.dataFromClients.delete(clientId);
                    refreshDisplayed();
                  },
                });
              }}
              class="grow flex-col items-start gap-1! text-sm"
            >
              <span>
                {#if client}
                  {client.info.name}
                  {#if client.info.team}
                    <span class="text-xs font-light">({client.info.team})</span>
                  {/if}
                {:else}
                  Disconnected
                {/if}
              </span>

              {#if data.comps.length}
                <span>Comps: {data.comps.length}</span>
              {/if}

              {#if data.surveys.length}
                <span>Surveys: {data.surveys.length}</span>
              {/if}

              {#if data.fields.length}
                <span>Fields: {data.fields.length}</span>
              {/if}

              {#if data.entries.length}
                <span>Entries: {data.entries.length}</span>
              {/if}
            </Button>

            <Button
              onclick={() => {
                onlineTransfer.dataFromClients.delete(clientId);
                refreshDisplayed();
              }}
            >
              <XIcon class="text-theme" />
            </Button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if displayedClients.length}
    <div class="flex flex-col">
      <span class="text-sm font-light">Request from</span>

      <div class="flex flex-col gap-2">
        <Button onclick={requestFromAll}>
          <DownloadIcon class="text-theme" />
          Everyone
        </Button>

        {#each displayedClients as client (client.info.id)}
          <Button onclick={() => requestFrom(client.info.id)}>
            <div class="w-6 shrink-0"></div>
            <span class="text-sm">
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
    <RoomWidget hideTitle />
  {/if}
{:else if currentTab == "qrfcode"}
  {#if anyImported}
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
    class="file:mr-3 file:border-none file:bg-neutral-800 file:p-2 file:text-theme"
  />
{/if}

{#if currentTab != "room" && anyImported}
  <ImportViewer {imported} {existing} {overwriteDuplicateEntries} />

  {#if duplicateIds.entries.size}
    <Button
      onclick={() => (overwriteDuplicateEntries = !overwriteDuplicateEntries)}
      class={["grow basis-0", overwriteDuplicateEntries ? "font-bold" : "font-light"]}
    >
      {#if overwriteDuplicateEntries}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-theme" />
      {/if}
      <div class="flex flex-col">Overwrite duplicate entries</div>
    </Button>
  {/if}
{/if}

{#if error}
  <span>{error}</span>
{/if}
