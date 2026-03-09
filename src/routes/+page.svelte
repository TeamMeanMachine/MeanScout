<script lang="ts">
  import {
    ArrowRightIcon,
    ChevronsLeftRightEllipsisIcon,
    DownloadIcon,
    InfoIcon,
    PlusIcon,
    SettingsIcon,
  } from "@lucide/svelte";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { openDialog } from "$lib/dialog";
  import BulkImportDialog from "$lib/dialogs/BulkImportDialog.svelte";
  import NewCompDialog from "$lib/dialogs/NewCompDialog.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { webRtcActiveStore } from "$lib/settings";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<Header class="max-w-(--breakpoint-sm)" />

<div class="mx-auto mt-[69px] mb-3 flex w-full max-w-(--breakpoint-sm) grow flex-col gap-6 p-3">
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Comps</h2>

    {#if data.all.comps.length}
      {#each data.all.comps.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as comp (comp.id)}
        <Anchor route="comp/{comp.id}">
          <div class="flex grow flex-col">
            <span>{comp.name}</span>
            <span class="text-xs font-light">{comp.id}</span>
          </div>
          <ArrowRightIcon class="text-theme" />
        </Anchor>
      {/each}
    {/if}

    <Button onclick={() => openDialog(BulkImportDialog, { existing: data.all, request: "all" })} class="relative">
      <DownloadIcon
        class={["text-theme", onlineTransfer.dataFromClients.size ? "animate-bounce-down" : "animate-none"]}
      />
      <div class={["flex flex-col", onlineTransfer.dataFromClients.size ? "animate-pulse" : "animate-none"]}>
        Receive
        <span class="text-xs font-light">Comps, surveys, entries</span>
      </div>
      {#if onlineTransfer.dataFromClients.size}
        <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
          {onlineTransfer.dataFromClients.size}
        </span>
      {/if}
    </Button>
    <Button onclick={() => openDialog(NewCompDialog, {})}>
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
    <Anchor route="settings">
      <SettingsIcon class="text-theme" />
      <div class="flex grow flex-col">
        Settings
        <span class="text-xs font-light">App config</span>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
    <Anchor route="about">
      <InfoIcon class="text-theme" />
      <div class="flex grow flex-col">
        About
        <span class="text-xs font-light">Info, Guides</span>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
  </div>
</div>
