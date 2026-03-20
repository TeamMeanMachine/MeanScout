<script lang="ts">
  import {
    ArrowBigDownDashIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ChevronsLeftRightEllipsisIcon,
    DownloadIcon,
    InfoIcon,
    Settings2Icon,
    SettingsIcon,
    ShareIcon,
  } from "@lucide/svelte";
  import { appUpdate } from "$lib/app-update.svelte";
  import type { CompPageData } from "$lib/comp";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import FetchTbaDataButton from "$lib/components/FetchTbaDataButton.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { openDialog } from "$lib/dialog";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { webRtcActiveStore } from "$lib/settings";
  import BulkExportDialog from "./BulkExportDialog.svelte";
  import BulkImportDialog from "./BulkImportDialog.svelte";

  let {
    pageData,
  }: {
    pageData: CompPageData;
  } = $props();
</script>

<div class="flex flex-col gap-1">
  <div class="flex flex-col">
    <h2 class="font-bold">Send/Receive</h2>
    <span class="text-xs font-light">Via room, QRF code, file</span>
  </div>

  <div class="flex flex-wrap items-center gap-1">
    <Button
      onclick={() => {
        openDialog(BulkExportDialog, {
          send: "configs",
          comps: [pageData.compRecord],
          surveys: pageData.surveyRecords,
          fields: pageData.fieldRecords,
          entries: pageData.entryRecords,
        });
      }}
      class="relative grow"
    >
      <ShareIcon class={["text-theme", onlineTransfer.requestCounts.configs ? "animate-bounce" : "animate-none"]} />
      <span class={onlineTransfer.requestCounts.configs ? "animate-pulse" : "animate-none"}>Configs</span>
      {#if onlineTransfer.requestCounts.configs}
        <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
          {onlineTransfer.requestCounts.configs}
        </span>
      {/if}
    </Button>

    <Button
      onclick={() => {
        openDialog(BulkExportDialog, {
          send: "entries",
          comps: [pageData.compRecord],
          surveys: pageData.surveyRecords,
          fields: pageData.fieldRecords,
          entries: pageData.entryRecords,
        });
      }}
      class="relative grow"
    >
      <ShareIcon class={["text-theme", onlineTransfer.requestCounts.entries ? "animate-bounce" : "animate-none"]} />
      <span class={onlineTransfer.requestCounts.entries ? "animate-pulse" : "animate-none"}>Entries</span>
      {#if onlineTransfer.requestCounts.entries}
        <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
          {onlineTransfer.requestCounts.entries}
        </span>
      {/if}
    </Button>

    <Button
      onclick={() => {
        openDialog(BulkExportDialog, {
          send: "all",
          comps: [pageData.compRecord],
          surveys: pageData.surveyRecords,
          fields: pageData.fieldRecords,
          entries: pageData.entryRecords,
        });
      }}
      class="relative"
    >
      <ShareIcon class={["text-theme", onlineTransfer.requestCounts.all ? "animate-bounce" : "animate-none"]} />
      <span class={onlineTransfer.requestCounts.all ? "animate-pulse" : "animate-none"}>All</span>
      {#if onlineTransfer.requestCounts.all}
        <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
          {onlineTransfer.requestCounts.all}
        </span>
      {/if}
    </Button>
  </div>

  <Button
    onclick={() => {
      openDialog(BulkImportDialog, {
        request: "all",
        existing: pageData.all,
      });
    }}
    class="relative"
  >
    <DownloadIcon
      class={["text-theme", onlineTransfer.dataFromClients.size ? "animate-bounce-down" : "animate-none"]}
    />
    <div class={onlineTransfer.dataFromClients.size ? "animate-pulse" : "animate-none"}>Receive</div>
    {#if onlineTransfer.dataFromClients.size}
      <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
        {onlineTransfer.dataFromClients.size}
      </span>
    {/if}
  </Button>

  <Button onclick={() => openDialog(RoomWidget, {})} class="relative">
    <ChevronsLeftRightEllipsisIcon class={["text-theme", $webRtcActiveStore ? "animate-pulse" : ""]} />
    <div class="flex grow flex-col">
      {#if $webRtcActiveStore}
        View room
      {:else}
        Join a room
      {/if}
    </div>
    {#if $webRtcActiveStore}
      <span class="absolute bottom-0 left-0.5 text-xs font-light tracking-tighter italic">
        {onlineTransfer.clients.length}
      </span>
    {/if}
  </Button>
</div>

<div class="flex flex-col gap-1">
  <div class="flex flex-col">
    <h2 class="font-bold">{pageData.compRecord.name}</h2>
    <span class="text-xs font-light">{pageData.compRecord.id}</span>
  </div>

  {#if pageData.compRecord.tbaEventKey}
    <FetchTbaDataButton {pageData} />
  {/if}

  <Anchor route="comp/{pageData.compRecord.id}/admin">
    <Settings2Icon class="text-theme" />
    <div class="flex grow flex-col">Configure</div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
</div>

<div class="flex flex-col gap-1">
  <div class="flex flex-col">
    <h2 class="font-bold">MeanScout</h2>
    <span class="text-xs font-light">
      {import.meta.env.VITE_GIT_COMMIT_HASH}
      ({new Date(import.meta.env.VITE_GIT_COMMIT_DATE).toLocaleDateString()})
    </span>
  </div>

  {#if appUpdate.available}
    <Button onclick={() => location.reload()} class="mb-1">
      <ArrowBigDownDashIcon class="animate-bounce-down text-theme" />
      <div class="flex animate-pulse flex-col">
        <span>Update available!</span>
        <span class="text-xs font-light">Reload and apply update</span>
      </div>
    </Button>
  {/if}

  <Anchor route="">
    <ArrowLeftIcon class="text-theme" />
    <div class="flex grow flex-col">Main page</div>
  </Anchor>

  <Anchor route="settings">
    <SettingsIcon class="text-theme" />
    <div class="flex grow flex-col">Settings</div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>

  <Anchor route="about">
    <InfoIcon class="text-theme" />
    <div class="flex grow flex-col">About</div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
</div>
