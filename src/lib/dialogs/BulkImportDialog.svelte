<script lang="ts">
  import { DownloadIcon, RefreshCwIcon, SquareCheckBigIcon, SquareIcon, Undo2Icon, XIcon } from "@lucide/svelte";
  import { rerunAllContextLoads, sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ImportViewer from "$lib/components/ImportViewer.svelte";
  import QrCodeReader from "$lib/components/QRCodeReader.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { AllData } from "$lib/idb";
  import { importData, importSchema, type ImportedData } from "$lib/import";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { cameraStore } from "$lib/settings";
  import { z } from "zod";
  import HandleRtcResponseMessageDialog from "./HandleRtcResponseMessageDialog.svelte";

  let {
    existing,
    request,
  }: {
    existing: AllData;
    request: "entries" | "configs" | "all";
  } = $props();

  const tab = sessionStorageStore<"room" | "qrfcode" | "file">("import-data-tab", "room");

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

  let rtcMessages = $state($state.snapshot(onlineTransfer.rtcMessages.filter((m) => m.type == "response")));
  let rtcClients = $state($state.snapshot(onlineTransfer.remoteClients));

  const clientsChanged = $derived.by(() => {
    const savedIds = new Set(rtcClients.map((c) => c.info.id));
    const currentIds = new Set(onlineTransfer.remoteClients.map((c) => c.info.id));

    if (currentIds.symmetricDifference(savedIds).size) {
      return true;
    }
    return false;
  });

  function refreshMessages() {
    rtcMessages = $state.snapshot(onlineTransfer.rtcMessages.filter((m) => m.type == "response"));
  }

  function refreshClients() {
    rtcClients = $state.snapshot(onlineTransfer.remoteClients);
  }

  tab.subscribe(() => {
    refreshMessages();
    refreshClients();
  });

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
    <Button onclick={() => ($tab = "room")} class={$tab == "room" ? "font-bold" : "font-light"}>Room</Button>
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
</div>

{#if $tab == "room"}
  <Button
    onclick={() => {
      refreshMessages();
      refreshClients();
    }}
    class="relative self-start text-sm"
    disabled={onlineTransfer.rtcMessages.length == rtcMessages.length && !clientsChanged}
  >
    <RefreshCwIcon class="size-5 text-theme" />
    Refresh
    {#if onlineTransfer.rtcMessages.length != rtcMessages.length || clientsChanged}
      <span class="absolute top-0 right-0.5 text-xs font-bold tracking-tighter italic"> ! </span>
    {/if}
  </Button>

  {#if rtcMessages.length}
    <div class="flex flex-col">
      <span class="text-sm font-light">Incoming data</span>

      <div class="flex flex-col gap-2">
        {#each rtcMessages as message}
          {@const client = message.from ? onlineTransfer.clients.get(message.from) : undefined}

          <div class="flex items-stretch gap-1">
            <Button
              onclick={() => {
                openDialog(HandleRtcResponseMessageDialog, {
                  message,
                  client: client?.info || { id: "", name: "Disconnected" },
                  existing,
                  onhandle() {
                    onlineTransfer.clearRtcMessage(message);
                    refreshMessages();
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

            <Button
              onclick={() => {
                onlineTransfer.clearRtcMessage(message);
                refreshMessages();
              }}
            >
              <XIcon class="text-theme" />
            </Button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if onlineTransfer.remoteClients.length}
    <div class="flex flex-col">
      <span class="text-sm font-light">Request from</span>

      <div class="flex flex-col gap-2">
        <Button onclick={requestFromAll}>
          <DownloadIcon class="text-theme" />
          Everyone
        </Button>

        {#each onlineTransfer.remoteClients as client (client.info.id)}
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
    <RoomWidget />
  {/if}
{:else if $tab == "qrfcode" && $cameraStore}
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

{#if $tab != "room" && anyImported}
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
