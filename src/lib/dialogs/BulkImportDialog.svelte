<script lang="ts">
  import { DownloadIcon, LogOutIcon, SquareCheckBigIcon, SquareIcon, Undo2Icon, XIcon } from "@lucide/svelte";
  import { rerunAllContextLoads, sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import ImportViewer from "$lib/components/ImportViewer.svelte";
  import QrCodeReader from "$lib/components/QRCodeReader.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { AllData } from "$lib/idb";
  import { importData, importSchema, type ImportedData } from "$lib/import.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { webRtcActiveStore, webRtcAutoReceiveStore, webRtcAutoSendStore } from "$lib/settings";
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

  function changeTab(to: "room" | "qrfcode" | "file") {
    error = "";
    currentTab = to;
    $storedTab = to;
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
  {#if onlineTransfer.localId}
    <div class="-m-1 flex h-[400px] flex-col gap-3 overflow-auto p-1">
      {#if onlineTransfer.clients.length}
        <div class="flex flex-col">
          <span class="text-sm font-light">Request from</span>
          <Button onclick={requestFromAll}>
            <DownloadIcon class="text-theme" />
            <div class="flex flex-col">
              Everyone
              <span class="text-xs font-light">{onlineTransfer.clients.length} connected</span>
            </div>
          </Button>
        </div>

        <div class="flex flex-col gap-2">
          {#each onlineTransfer.clients as client (client.info.id)}
            {@const response = onlineTransfer.dataFromClients.get(client.info.id)}

            <div class="flex gap-1">
              <Button
                onclick={() => {
                  if (response) {
                    openDialog(HandleRtcResponseMessageDialog, {
                      data: response,
                      client: client?.info || { id: "", name: "Disconnected" },
                      existing,
                      onhandle() {
                        onlineTransfer.dataFromClients.delete(client.info.id);
                      },
                    });
                  } else {
                    requestFrom(client.info.id);
                  }
                }}
                disabled={!client.channel}
                class="grow"
              >
                <div class="flex grow flex-col">
                  {client.info.name}
                  {#if client.info.team}
                    <span class="text-xs font-light">{client.info.team}</span>
                  {/if}
                </div>

                {#if response}
                  {@const sentEntries = response.entries?.length}
                  {@const sentConfigs = response.comps?.length || response.surveys?.length || response.fields?.length}
                  {@const sentAll = sentEntries && sentConfigs}

                  <div class="flex flex-col text-right text-xs font-light">
                    sent
                    <span>
                      {#if sentAll}
                        data
                      {:else if sentEntries}
                        entries
                      {:else if sentConfigs}
                        configs
                      {:else}
                        data
                      {/if}
                    </span>
                  </div>
                  <DownloadIcon class="text-theme" />
                {/if}
              </Button>

              {#if response}
                <Button
                  onclick={() => {
                    onlineTransfer.dataFromClients.delete(client.info.id);
                  }}
                >
                  <XIcon class="text-theme" />
                </Button>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <span class="text-sm">Nobody else is active in this room.</span>
      {/if}
    </div>

    <div class="flex flex-wrap gap-3">
      <Button onclick={() => ($webRtcAutoSendStore = $webRtcAutoSendStore ? "" : "entries")} class="grow basis-40">
        {#if $webRtcAutoSendStore}
          <SquareCheckBigIcon class="text-theme" />
        {:else}
          <SquareIcon class="text-theme" />
        {/if}
        <div class={["flex flex-col", $webRtcAutoSendStore ? "font-bold" : "font-light"]}>
          Auto-send
          <span class="text-xs font-light">Entries</span>
        </div>
      </Button>

      <Button
        onclick={() => ($webRtcAutoReceiveStore = $webRtcAutoReceiveStore ? "" : "new-entries")}
        class="grow basis-40"
      >
        {#if $webRtcAutoReceiveStore}
          <SquareCheckBigIcon class="text-theme" />
        {:else}
          <SquareIcon class="text-theme" />
        {/if}
        <div class={["flex flex-col", $webRtcAutoReceiveStore ? "font-bold" : "font-light"]}>
          Auto-receive
          <span class="text-xs font-light">New entries</span>
        </div>
      </Button>
    </div>

    <Button
      onclick={() => {
        $webRtcActiveStore = "";
        onlineTransfer.leaveRoom();
      }}
    >
      <LogOutIcon class="text-theme" />
      Leave
    </Button>
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
