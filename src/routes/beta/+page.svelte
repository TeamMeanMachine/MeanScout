<script lang="ts">
  import {
    ArrowBigDownDashIcon,
    ArrowRightIcon,
    ChevronsLeftRightEllipsisIcon,
    DownloadIcon,
    InfoIcon,
    PlusIcon,
    SettingsIcon,
  } from "@lucide/svelte";
  import { appUpdate } from "$lib/app-update.svelte";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { MetaDB } from "$lib/db";
  import { openDialog } from "$lib/dialog";
  import BulkImportDialog from "$lib/dialogs/BulkImportDialog.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { webRtcActiveStore } from "$lib/settings";
  import NewEventDialog from "./NewEventDialog.svelte";
</script>

<Header class="max-w-(--breakpoint-sm)" />

<div class="mx-auto mt-17.25 mb-3 flex w-full max-w-(--breakpoint-sm) grow flex-col gap-6 p-3">
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Events</h2>

    {#each MetaDB.events.toSorted((a, b) => b.made.at - a.made.at) as event (event.id)}
      <Anchor route="beta/event/{event.id}">
        <div class="flex grow flex-col">
          <span>{event.name}</span>
          <span class="text-xs font-light">{event.id}</span>
        </div>
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    {/each}

    <Button onclick={() => {}} class="relative">
      <DownloadIcon
        class={["text-theme", onlineTransfer.dataFromClients.size ? "animate-bounce-down" : "animate-none"]}
      />
      <div class={["flex flex-col", onlineTransfer.dataFromClients.size ? "animate-pulse" : "animate-none"]}>
        Receive
        <span class="text-xs font-light">Data</span>
      </div>
      {#if onlineTransfer.dataFromClients.size}
        <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
          {onlineTransfer.dataFromClients.size}
        </span>
      {/if}
    </Button>
    <Button onclick={() => openDialog(NewEventDialog, {})}>
      <PlusIcon class="text-theme" />
      <div class="flex flex-col">
        Create
        <span class="text-xs font-light">New</span>
      </div>
    </Button>
  </div>

  <div class="flex flex-col gap-2">
    <div class="flex flex-col">
      <h2 class="font-bold">MeanScout</h2>
      <span class="text-xs font-light">
        {import.meta.env.VITE_GIT_COMMIT_HASH}
        ({new Date(import.meta.env.VITE_GIT_COMMIT_DATE).toLocaleDateString()})
      </span>
    </div>
    {#if appUpdate.available}
      <Button onclick={() => location.reload()}>
        <ArrowBigDownDashIcon class="animate-bounce-down text-theme" />
        <div class="flex animate-pulse flex-col">
          <span>Update available!</span>
          <span class="text-xs font-light">Reload and apply update</span>
        </div>
      </Button>
    {/if}
    <Button onclick={() => openDialog(RoomWidget, {})} class="relative">
      <ChevronsLeftRightEllipsisIcon class={["text-theme", $webRtcActiveStore && "animate-pulse"]} />
      <div class="flex grow flex-col">
        {#if $webRtcActiveStore}
          View room
        {:else}
          Join a room
        {/if}
        <span class="text-xs font-light">Send data over the internet</span>
        {#if $webRtcActiveStore}
          <span class="absolute bottom-0 left-0.5 text-xs font-light tracking-tighter italic">
            {onlineTransfer.clients.length}
          </span>
        {/if}
      </div>
    </Button>
    <Anchor route="beta/settings">
      <SettingsIcon class="text-theme" />
      <div class="flex grow flex-col">
        Settings
        <span class="text-xs font-light">App config</span>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
    <Anchor route="beta/about">
      <InfoIcon class="text-theme" />
      <div class="flex grow flex-col">
        About
        <span class="text-xs font-light">Info, Guides</span>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
  </div>
</div>
