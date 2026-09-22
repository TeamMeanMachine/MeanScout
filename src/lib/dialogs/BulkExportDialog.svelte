<script lang="ts">
  /** TODO */

  import {
    FileBracesIcon,
    LogOutIcon,
    Share2Icon,
    ShareIcon,
    SquareCheckBigIcon,
    SquareIcon,
    XIcon,
  } from "@lucide/svelte";
  import { download, rerunAllContextLoads, schemaVersion, serializeDate, sessionStorageStore, share } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import type { ImportedData } from "$lib/import.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { webRtcActiveStore, webRtcAutoReceiveStore } from "$lib/settings";

  let {
    send,
    data,
    onexport,
  }: {
    send: "entries" | "configs" | "all";
    data: ImportedData;
    onexport?: () => void;
  } = $props();

  const storedTab = sessionStorageStore<"room" | "qrfcode" | "file">(
    "export-data-tab",
    navigator.onLine ? "room" : "qrfcode",
  );
  let currentTab = $state(onlineTransfer.requestsFromClients.size ? "room" : $storedTab);

  // svelte-ignore state_referenced_locally
  const completedEntries = data.entries?.filter((e) => e.status != "draft");
  // svelte-ignore state_referenced_locally
  const unexportedEntries = data.entries?.filter((e) => e.status == "submitted");

  // svelte-ignore state_referenced_locally
  const defaultExportedData = JSON.stringify(
    $state.snapshot({
      version: schemaVersion,
      comps: send != "entries" ? data.comps : undefined,
      surveys: send != "entries" ? data.surveys : undefined,
      fields: send != "entries" ? data.fields : undefined,
      entries: send != "configs" ? completedEntries : undefined,
    }),
    (key, value) => {
      if (key == "created" || key == "modified") return serializeDate(value);
      return value;
    },
  );

  const fileName = ["ms", compsDescriptor(), surveysDescriptor(), fieldsDescriptor(), entriesDescriptor()]
    .filter((p) => p)
    .join("-")
    .replaceAll(" ", "_")
    .toLowerCase();

  function changeTab(to: "room" | "qrfcode" | "file") {
    currentTab = to;
    $storedTab = to;
  }

  function shareBulkAsFile() {
    // Web Share API does not allow JSON files.
    // https://docs.google.com/document/d/1tKPkHA5nnJtmh2TgqWmGSREUzXgMUFDL6yMdVZHqUsg
    share(defaultExportedData, `${fileName}.txt`, "text/plain");
  }

  function saveBulkAsFile() {
    download(defaultExportedData, `${fileName}.json`, "application/json");
  }

  function sendBulkTo(id: string) {
    const sending = onlineTransfer.requestsFromClients.get(id) || send;

    if (sending == "entries") {
      onlineTransfer.sendTo(id, {
        type: "response",
        data: { entries: completedEntries },
      });
    } else if (sending == "configs") {
      onlineTransfer.sendTo(id, {
        type: "response",
        data: { comps: data.comps, surveys: data.surveys, fields: data.fields },
      });
    } else {
      onlineTransfer.sendTo(id, {
        type: "response",
        data: { comps: data.comps, surveys: data.surveys, fields: data.fields, entries: completedEntries },
      });
    }

    onlineTransfer.requestsFromClients.delete(id);
  }

  function sendBulkToAll() {
    for (const client of onlineTransfer.clients) {
      sendBulkTo(client.info.id);
    }
  }

  function sendBulkToRequests() {
    for (const [clientId] of onlineTransfer.requestsFromClients) {
      sendBulkTo(clientId);
    }
  }

  function compsDescriptor() {
    if (!data.comps?.length) return undefined;
    if (data.comps.length == 1) return data.comps[0].name;
    return `c${data.comps.length}`;
  }

  function surveysDescriptor() {
    if (!data.surveys?.length) return undefined;
    if (data.surveys.length == 1) return data.surveys[0].name;
    return `s${data.surveys.length}`;
  }

  function fieldsDescriptor() {
    if (!data.fields?.length) return undefined;
    return `f${data.fields.length}`;
  }

  function entriesDescriptor() {
    if (!data.entries?.length) return undefined;
    return `e${data.entries.length}`;
  }

  export const { onconfirm }: DialogExports = {
    onconfirm: unexportedEntries?.length
      ? () => {
          const tx = idb.transaction(["comps", "surveys", "entries"], "readwrite");
          const now = Date.now();

          const entryStore = tx.objectStore("entries");
          for (const entry of unexportedEntries) {
            entryStore.put({ ...$state.snapshot(entry), status: "exported", modified: now });
          }

          if (data.comps?.length) {
            const compStore = tx.objectStore("entries");
            for (const comp of data.comps) {
              compStore.put({ ...$state.snapshot(comp), modified: now });
            }
          }

          if (data.surveys?.length) {
            const surveyStore = tx.objectStore("entries");
            for (const survey of data.surveys) {
              surveyStore.put({ ...$state.snapshot(survey), modified: now });
            }
          }

          tx.oncomplete = () => {
            rerunAllContextLoads();
            onexport?.();
            closeDialog();
          };
        }
      : undefined,
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Send {send}</span>

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
    <div class="-m-1 flex h-100 flex-col gap-3 overflow-auto p-1">
      {#if onlineTransfer.clients.length}
        <div class="flex flex-col">
          <span class="text-sm font-light">Send to</span>
          <div class="flex gap-1">
            <Button onclick={sendBulkToAll} class="grow">
              <ShareIcon class="text-theme" />
              <div class="flex flex-col">
                Everyone
                <span class="text-xs font-light">{onlineTransfer.clients.length} connected</span>
              </div>
            </Button>
            {#if onlineTransfer.requestsFromClients.size}
              <Button onclick={sendBulkToRequests}>
                <ShareIcon class="text-theme" />
                <div class="flex flex-col">
                  Requesters
                  <span class="text-xs font-light">{onlineTransfer.requestsFromClients.size} requested</span>
                </div>
              </Button>
            {/if}
          </div>
        </div>

        <div class="flex flex-col gap-2">
          {#each onlineTransfer.clients as client (client.info.id)}
            {@const request = onlineTransfer.requestsFromClients.get(client.info.id)}

            <div class="flex gap-1">
              <Button onclick={() => sendBulkTo(client.info.id)} class="grow">
                <div class="flex grow flex-col">
                  {client.info.name}
                  {#if client.info.team}
                    <span class="text-xs font-light">{client.info.team}</span>
                  {/if}
                </div>

                {#if request}
                  <div class="flex flex-col text-right text-xs font-light">
                    wants
                    <span>{request}</span>
                  </div>
                  <ShareIcon class="text-theme" />
                {/if}
              </Button>

              {#if request}
                <Button
                  onclick={() => {
                    onlineTransfer.requestsFromClients.delete(client.info.id);
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

    <Button onclick={() => ($webRtcAutoReceiveStore = $webRtcAutoReceiveStore ? "" : "new-entries")}>
      {#if $webRtcAutoReceiveStore}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-neutral-500" />
      {/if}
      <div class={["flex flex-col", $webRtcAutoReceiveStore ? "font-bold" : "font-light"]}>
        Auto-receive
        <span class="text-xs font-light">New entries</span>
      </div>
    </Button>

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
  <QrCodeDisplay data={defaultExportedData} />
{:else}
  {#if "canShare" in navigator}
    <Button onclick={shareBulkAsFile}>
      <Share2Icon class="text-theme" />
      <div class="flex flex-col">
        Share
        <span class="text-xs font-light">As raw text</span>
      </div>
    </Button>
  {/if}
  <Button onclick={saveBulkAsFile}>
    <FileBracesIcon class="text-theme" />
    <div class="flex flex-col">
      Save
      <span class="text-xs font-light">As JSON</span>
    </div>
  </Button>
{/if}

{#if unexportedEntries?.length}
  <span>Mark as exported?</span>
{/if}
