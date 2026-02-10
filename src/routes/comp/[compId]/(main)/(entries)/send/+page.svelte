<script lang="ts">
  import { CheckIcon, FileDownIcon, Share2Icon, ShareIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import {
    download,
    rerunAllContextLoads,
    rerunOtherContextLoads,
    schemaVersion,
    sessionStorageStore,
    share,
  } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { openDialog } from "$lib/dialog";
  import HandleRtcMessageDialog from "$lib/dialogs/HandleRtcMessageDialog.svelte";
  import { idb } from "$lib/idb";
  import { onlineTransfer, type RTCRequestMessage } from "$lib/online-transfer.svelte";
  import { cameraStore } from "$lib/settings";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const entries = $derived(data.entryRecords.filter((e) => e.status != "draft"));
  const unexportedEntries = $derived(data.entryRecords.filter((e) => e.status == "submitted"));

  const tab = sessionStorageStore<"room" | "qrfcode" | "file">("export-data-tab", "room");

  const json = generateExportedData();
  const string = JSON.stringify(json);

  const fileName = ["ms", entriesDescriptor()]
    .filter((p) => p)
    .join("-")
    .replaceAll(" ", "_")
    .toLowerCase();

  function shareBulkAsFile() {
    // Web Share API does not allow JSON files.
    // https://docs.google.com/document/d/1tKPkHA5nnJtmh2TgqWmGSREUzXgMUFDL6yMdVZHqUsg
    share(string, `${fileName}.txt`, "text/plain");
  }

  function saveBulkAsFile() {
    download(string, `${fileName}.json`, "application/json");
  }

  function sendBulkToAll() {
    if (!onlineTransfer.localId) return;
    onlineTransfer.sendToAll({ ...json, type: "response" });
  }

  function sendBulkTo(id: string) {
    if (!onlineTransfer.localId || onlineTransfer.localId == id) return;
    onlineTransfer.sendTo(id, { ...json, type: "response" });
  }

  function entriesDescriptor() {
    if (!entries?.length) return undefined;
    return "e" + entries.length;
  }

  function generateExportedData() {
    const preparedEntries = $state.snapshot(entries).map((entry) => {
      return {
        ...entry,
        type: undefined,
        status: undefined,
        created: undefined,
        modified: undefined,
      };
    });

    return {
      version: schemaVersion,
      entries: preparedEntries,
    };
  }
</script>

<div class="mt-[57px] grow overflow-x-hidden px-3 py-6 max-lg:mb-[65px] lg:ml-80">
  <div class="mx-auto flex max-w-[516px] flex-col space-y-6">
    <div class="flex flex-col gap-3">
      <div class="flex flex-col">
        <h2 class="font-bold">Send</h2>
        <span class="text-xs font-light">{entries.length} completed/exported entries</span>
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
          <span class="text-xs font-light">Export</span>
        </Button>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      {#if $tab == "room"}
        {#each onlineTransfer.rtcMessages.filter((m): m is RTCRequestMessage => m.type == "request" && m.request == "entries") as message}
          {@const client = message.from ? onlineTransfer.clients.get(message.from) : undefined}
          <Button
            onclick={() => {
              if (!client) return;
              openDialog(HandleRtcMessageDialog, {
                message,
                client: client.info,
                onhandle(action) {
                  if (action == "accept") {
                  }

                  onlineTransfer.clearRtcMessage(message);
                },
              });
            }}
            class="flex-col items-start gap-1!"
          >
            {#if client}
              <span>From: {client.info.name} {client.info.team ? `(${client.info.team})` : ""}</span>
            {/if}

            <span>Requesting: {message.request}</span>
          </Button>
        {/each}

        {#if onlineTransfer.remoteClients.length}
          <Button onclick={sendBulkToAll}>
            <ShareIcon class="text-theme" />
            Send to everyone
          </Button>

          <div class="flex flex-col">
            <span class="text-sm font-light">Send to</span>

            <div class="flex flex-col gap-2">
              {#each onlineTransfer.remoteClients as client (client.info.id)}
                <Button onclick={() => sendBulkTo(client.info.id)}>
                  <ShareIcon class="size-5 text-theme" />
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
        <QrCodeDisplay data={string} />
      {:else}
        {#if "canShare" in navigator}
          <Button onclick={shareBulkAsFile}>
            <Share2Icon class="text-theme" />
            <div class="flex flex-col">
              Share
              <span class="text-xs font-light">{fileName}.txt</span>
            </div>
          </Button>
        {/if}
        <Button onclick={saveBulkAsFile}>
          <FileDownIcon class="text-theme" />
          <div class="flex flex-col">
            Save
            <span class="text-xs font-light">{fileName}.json</span>
          </div>
        </Button>
      {/if}
    </div>

    {#if unexportedEntries.length}
      <Button
        onclick={() => {
          const tx = idb.transaction(["comps", "entries"], "readwrite");
          const entryStore = tx.objectStore("entries");
          for (const entry of unexportedEntries) {
            if (entry.status == "exported") {
              continue;
            }
            entryStore.put({ ...entry, status: "exported", modified: new Date() });
          }
          tx.objectStore("comps").put({ ...$state.snapshot(data.compRecord), modified: new Date() });
          tx.oncomplete = () => {
            rerunOtherContextLoads();
            goto(`#/comp/${data.compRecord.id}`, { invalidateAll: true });
          };
        }}
      >
        <CheckIcon class="text-theme" />
        <div class="flex flex-col">
          Mark as exported
          <span class="text-xs font-light"></span>
        </div>
      </Button>
    {/if}
  </div>
</div>
