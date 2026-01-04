<script lang="ts">
  import { ArrowRightIcon, DownloadIcon, InfoIcon, PlusIcon, SettingsIcon } from "@lucide/svelte";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import BulkImportDialog from "$lib/dialogs/BulkImportDialog.svelte";
  import NewCompDialog from "$lib/dialogs/NewCompDialog.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<Header />

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

    <Button onclick={() => openDialog(BulkImportDialog, {})}>
      <DownloadIcon class="text-theme" />
      <div class="flex flex-col">
        Receive
        <span class="text-xs font-light">Comps, surveys, entries</span>
      </div>
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
