<script lang="ts">
  import { FileJsonIcon, Share2Icon, ShareIcon } from "@lucide/svelte";
  import { download, schemaVersion, sessionStorageStore, share } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QrCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Entry } from "$lib/entry";
  import type { Field } from "$lib/field";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import type { Survey } from "$lib/survey";

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

  const tab = sessionStorageStore<"room" | "qrfcode" | "file">("export-data-tab", "room");

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
    onconfirm: onexport
      ? () => {
          onexport();
          closeDialog();
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
  }

  function sendBulkTo(id: string) {
    if (!onlineTransfer.localId || onlineTransfer.localId == id) return;
    onlineTransfer.sendTo(id, { ...json, type: "response" });
  }

  function compsDescriptor() {
    if (!comps?.length) return undefined;
    if (comps.length == 1) return comps[0].name;
    return "c" + comps.length;
  }

  function surveysDescriptor() {
    if (!surveys?.length) return undefined;
    if (surveys.length == 1) return surveys[0].name;
    return "s" + surveys.length;
  }

  function fieldsDescriptor() {
    if (!fields?.length) return undefined;
    return "f" + fields.length;
  }

  function entriesDescriptor() {
    if (!entries?.length) return undefined;
    return "e" + entries.length;
  }

  function generateExportedData() {
    return $state.snapshot({ version: schemaVersion, comps, surveys, fields, entries });
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Export data</span>

  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "room")} class={$tab == "room" ? "font-bold" : "font-light"}>Room</Button>
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
</div>

{#if $tab == "room"}
  {#if onlineTransfer.remoteClients.length}
    <Button onclick={sendBulkToAll}>
      <ShareIcon class="text-theme" />
      Send to all
    </Button>

    <div class="flex flex-col">
      <span class="text-sm font-light">Send to specific peer</span>

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
  {:else if onlineTransfer.localId}
    <span>No other peers in your room.</span>
  {:else}
    <span>You are not in a room.</span>
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
    <FileJsonIcon class="text-theme" />
    <div class="flex flex-col">
      Save
      <span class="text-xs font-light">As JSON</span>
    </div>
  </Button>
{/if}

{#if onexport}
  <span>Mark as exported?</span>
{/if}
