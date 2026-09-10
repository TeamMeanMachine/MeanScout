<script lang="ts">
  import {
    ArrowBigDownDashIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ChevronsLeftRightEllipsisIcon,
    CloudDownloadIcon,
    DownloadIcon,
    InfoIcon,
    LoaderIcon,
    Settings2Icon,
    SettingsIcon,
    ShareIcon,
    XIcon,
  } from "@lucide/svelte";
  import { invalidateAll } from "$app/navigation";
  import { appUpdate } from "$lib/app-update.svelte";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { EventDB, MetaDB } from "$lib/db";
  import { Dialog, openDialog } from "$lib/dialog";
  import { fetchEventData } from "$lib/fetch";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { webRtcActiveStore } from "$lib/settings";

  // import BulkExportDialog from "./BulkExportDialog.svelte";
  // import BulkImportDialog from "./BulkImportDialog.svelte";

  let {
    event,
  }: {
    event: Readonly<MetaDB.Event>;
  } = $props();

  const ctx = Dialog.getContext();

  let fetching = $state(false);

  function fetchData() {
    if (!event.key) return;
    fetching = true;
    fetchEventData({ eventKey: event.key, remapTeams: event.remapTeams, fetchEvent: true })
      .then((data) => {
        const updatedEvent = { ...event, alliances: data.alliances, remapTeams: data.remapTeams };
        return Promise.allSettled([
          MetaDB.events.merge(updatedEvent).then(() => (event = MetaDB.events.get(event.id) || updatedEvent)),
          MetaDB.teams.mergeMap(data.metaTeams),
          EventDB.teams.mergeMap(data.eventTeams),
          EventDB.matches.mergeMap(data.matches),
        ]);
      })
      .finally(() => {
        fetching = false;
        invalidateAll();
      });
  }
</script>

<div class="flex items-start justify-between border-b border-neutral-600 p-3">
  <div class="flex w-80 flex-col text-base/tight">
    <h2 class="font-bold">{event.name}</h2>
    <span class="text-xs/tight font-light">{event.id}</span>
  </div>

  <div class="flex gap-2">
    <Anchor to="/event/[eventId]/config" params={{ eventId: event.id }}>
      <Settings2Icon class="size-5 text-theme" />
    </Anchor>
    <Button onclick={ctx.close}>
      <XIcon class="size-5 text-theme" />
    </Button>
  </div>
</div>

<div class="flex flex-col gap-3 overflow-y-auto p-3">
  {#if event.key}
    <Button onclick={fetchData} disabled={fetching}>
      {#if fetching}
        <LoaderIcon class="animate-spin text-theme" />
      {:else}
        <CloudDownloadIcon class="text-theme" />
      {/if}
      <div class="flex flex-col">
        Fetch data
        <span class="text-xs font-light">From TBA, Statbotics</span>
      </div>
    </Button>
  {/if}

  <div class="flex flex-col gap-1">
    <div class="flex flex-col">
      <h2 class="font-bold">Send/Receive</h2>
      <span class="text-xs font-light">Via room, QRF code, file</span>
    </div>

    <div class="flex flex-wrap gap-1">
      <Button
        onclick={() => {
          // openDialog(BulkExportDialog, {
          //   send: "all",
          //   comps: [pageData.compRecord],
          //   surveys: pageData.surveyRecords,
          //   fields: pageData.fieldRecords,
          //   entries: pageData.entryRecords,
          // });
        }}
        class="relative grow basis-40"
      >
        <ShareIcon class={["text-theme", onlineTransfer.requestCounts.all ? "animate-bounce" : "animate-none"]} />
        <span class={onlineTransfer.requestCounts.all ? "animate-pulse" : "animate-none"}>Send</span>
        {#if onlineTransfer.requestCounts.all}
          <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
            {onlineTransfer.requestCounts.all}
          </span>
        {/if}
      </Button>

      <Button
        onclick={() => {
          // openDialog(BulkImportDialog, {
          //   request: "all",
          //   existing: pageData.all,
          // });
        }}
        class="relative grow basis-40"
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
    </div>

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

    <Anchor to="/">
      <ArrowLeftIcon class="text-theme" />
      <div class="flex grow flex-col">Main page</div>
    </Anchor>

    <Anchor to="/settings">
      <SettingsIcon class="text-theme" />
      <div class="flex grow flex-col">Settings</div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>

    <Anchor to="/about">
      <InfoIcon class="text-theme" />
      <div class="flex grow flex-col">About</div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
  </div>
</div>
