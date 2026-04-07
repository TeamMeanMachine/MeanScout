<script lang="ts">
  import {
    FileBracesIcon,
    LogOutIcon,
    Share2Icon,
    ShareIcon,
    SquareCheckBigIcon,
    SquareIcon,
    XIcon,
  } from "@lucide/svelte";
  import { download, rerunAllContextLoads, schemaVersion, sessionStorageStore, share } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import type { Field } from "$lib/field";
  import { idb } from "$lib/idb";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { webRtcActiveStore, webRtcAutoReceiveStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    send,
    comps,
    surveys,
    fields,
    entries,
    onexport,
  }: {
    send: "entries" | "configs" | "all";
    comps?: Comp[];
    surveys?: Survey[];
    fields?: Field[];
    entries?: Entry[];
    onexport?: () => void;
  } = $props();

  const storedTab = sessionStorageStore<"room" | "qrfcode" | "file">(
    "export-data-tab",
    navigator.onLine ? "room" : "qrfcode",
  );
  let currentTab = $state(onlineTransfer.requestsFromClients.size ? "room" : $storedTab);

  const completedEntries = entries?.filter((e) => e.status != "draft");
  const unexportedEntries = entries?.filter((e) => e.status == "submitted");

  const defaultExportedData = JSON.stringify(
    $state.snapshot({
      version: schemaVersion,
      comps: send != "entries" ? comps : undefined,
      surveys: send != "entries" ? surveys : undefined,
      fields: send != "entries" ? fields : undefined,
      entries: send != "configs" ? completedEntries : undefined,
    }),
    (key, value) => {
      if (key == "created" || key == "modified") {
        return undefined;
      }
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
        entries: entries?.filter((e) => e.status != "draft"),
      });
    } else if (sending == "configs") {
      onlineTransfer.sendTo(id, {
        type: "response",
        comps,
        surveys,
        fields,
      });
    } else {
      onlineTransfer.sendTo(id, {
        type: "response",
        comps,
        surveys,
        fields,
        entries: completedEntries,
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
    if (!comps?.length) return undefined;
    if (comps.length == 1) return comps[0].name;
    return `c${comps.length}`;
  }

  function surveysDescriptor() {
    if (!surveys?.length) return undefined;
    if (surveys.length == 1) return surveys[0].name;
    return `s${surveys.length}`;
  }

  function fieldsDescriptor() {
    if (!fields?.length) return undefined;
    return `f${fields.length}`;
  }

  function entriesDescriptor() {
    if (!entries?.length) return undefined;
    return `e${entries.length}`;
  }

  export const { onconfirm }: DialogExports = {
    onconfirm: unexportedEntries?.length
      ? () => {
          const tx = idb.transaction(["comps", "surveys", "entries"], "readwrite");

          const entryStore = tx.objectStore("entries");
          for (const entry of unexportedEntries) {
            entryStore.put({ ...$state.snapshot(entry), status: "exported", modified: new Date() });
          }

          if (comps?.length) {
            const compStore = tx.objectStore("entries");
            for (const comp of comps) {
              compStore.put({ ...$state.snapshot(comp), modified: new Date() });
            }
          }

          if (surveys?.length) {
            const surveyStore = tx.objectStore("entries");
            for (const survey of surveys) {
              surveyStore.put({ ...$state.snapshot(survey), modified: new Date() });
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
    <div class="-m-1 flex h-[400px] flex-col gap-3 overflow-auto p-1">
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
        <SquareIcon class="text-theme" />
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
