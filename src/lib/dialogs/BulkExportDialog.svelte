<script lang="ts">
  import { FileBracesIcon, RefreshCwIcon, Share2Icon, ShareIcon, XIcon } from "@lucide/svelte";
  import { download, rerunAllContextLoads, schemaVersion, sessionStorageStore, share } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import type { Field } from "$lib/field";
  import { idb } from "$lib/idb";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import type { Survey } from "$lib/survey";
  import HandleRtcRequestMessageDialog from "./HandleRtcRequestMessageDialog.svelte";

  let {
    comps,
    surveys,
    fields,
    entries,
    onexport,
  }: {
    comps?: Comp[];
    surveys?: Survey[];
    fields?: Field[];
    entries?: Entry[];
    onexport?: () => void;
  } = $props();

  let rtcMessages = $state($state.snapshot(onlineTransfer.rtcMessages.filter((m) => m.type == "request")));
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
    rtcMessages = $state.snapshot(onlineTransfer.rtcMessages.filter((m) => m.type == "request"));
  }

  function refreshClients() {
    rtcClients = $state.snapshot(onlineTransfer.remoteClients);
  }

  const unexportedEntries = entries?.filter((e) => e.status !== "exported");

  const isExportingConfigs = comps?.length || surveys?.length || fields?.length;
  const isExportingEntries = entries?.length;
  const whatIsExporting = isExportingConfigs && isExportingEntries ? "all" : isExportingConfigs ? "configs" : "entries";

  const tab = sessionStorageStore<"room" | "qrfcode" | "file">("export-data-tab", "room");
  tab.subscribe(() => {
    refreshMessages();
    refreshClients();
  });

  const json = generateExportedData();
  const jsonString = JSON.stringify(json, (key, value) => {
    if (key == "created" || key == "modified") {
      return undefined;
    }
    return value;
  });

  const fileName = ["ms", compsDescriptor(), surveysDescriptor(), fieldsDescriptor(), entriesDescriptor()]
    .filter((p) => p)
    .join("-")
    .replaceAll(" ", "_")
    .toLowerCase();

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

  function shareBulkAsFile() {
    // Web Share API does not allow JSON files.
    // https://docs.google.com/document/d/1tKPkHA5nnJtmh2TgqWmGSREUzXgMUFDL6yMdVZHqUsg
    share(jsonString, `${fileName}.txt`, "text/plain");
  }

  function saveBulkAsFile() {
    download(jsonString, `${fileName}.json`, "application/json");
  }

  function sendBulkToAll() {
    if (!onlineTransfer.localId) return;
    onlineTransfer.sendToAll({ ...json, type: "response" });
    refreshMessages();
  }

  function sendBulkTo(id: string) {
    if (!onlineTransfer.localId || onlineTransfer.localId == id) return;
    onlineTransfer.sendTo(id, { ...json, type: "response" });
    refreshMessages();
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

  function generateExportedData() {
    return $state.snapshot({
      version: schemaVersion,
      comps,
      surveys,
      fields,
      entries: entries?.filter((e) => e.status != "draft"),
    });
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Send {whatIsExporting}</span>

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
      <span class="text-sm font-light">Incoming requests</span>

      <div class="flex flex-col gap-2">
        {#each rtcMessages as message}
          {@const client = message.from ? onlineTransfer.clients.get(message.from) : undefined}

          <div class="flex items-center gap-1">
            <Button
              onclick={() => {
                if (!client) return;
                openDialog(HandleRtcRequestMessageDialog, {
                  message,
                  client: client.info,
                  onhandle() {
                    sendBulkTo(client.info.id);
                    onlineTransfer.clearRtcMessage(message);
                    refreshMessages();
                  },
                });
              }}
              class="grow"
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

  {#if rtcClients.length}
    <div class="flex flex-col">
      <span class="text-sm font-light">Send to</span>

      <div class="flex flex-col gap-2">
        <Button onclick={sendBulkToAll}>
          <ShareIcon class="text-theme" />
          Everyone
        </Button>

        {#each rtcClients as client (client.info.id)}
          <Button onclick={() => sendBulkTo(client.info.id)}>
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
{:else if $tab == "qrfcode"}
  <QrCodeDisplay data={jsonString} />
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
