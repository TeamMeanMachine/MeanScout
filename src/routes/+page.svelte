<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import NewCompDialog from "$lib/dialogs/NewCompDialog.svelte";
  import { cameraStore } from "$lib/settings";
  import { ArrowRightIcon, ImportIcon, InfoIcon, PlusIcon, SettingsIcon } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import BulkImportDialog from "$lib/dialogs/BulkImportDialog.svelte";

  let { data }: PageProps = $props();
</script>

<Header />

<div class="flex flex-col gap-2" style="view-transition-name:comps">
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

  <div class="flex flex-wrap gap-2">
    <Button onclick={() => openDialog(BulkImportDialog, {})} class="grow basis-48">
      <ImportIcon class="text-theme" />
      <div class="flex flex-col">
        Import
        <span class="text-xs font-light">
          {#if $cameraStore}
            QRF code, File
          {:else}
            File
          {/if}
        </span>
      </div>
    </Button>
    <Button onclick={() => openDialog(NewCompDialog, {})} class="grow basis-48">
      <PlusIcon class="text-theme" />
      <div class="flex flex-col">
        Create
        <span class="text-xs font-light">New</span>
      </div>
    </Button>
  </div>
</div>

<div class="flex flex-col gap-2" style="view-transition-name:meanscout">
  <div class="flex flex-col">
    <h2 class="font-bold">MeanScout</h2>
    <span class="text-xs font-light">
      {import.meta.env.VITE_GIT_COMMIT_HASH}
      ({new Date(import.meta.env.VITE_GIT_COMMIT_DATE).toLocaleDateString()})
    </span>
  </div>
  <div class="flex flex-wrap gap-2">
    <Anchor route="settings" class="grow basis-48" style="view-transition-name:settings">
      <SettingsIcon class="text-theme" />
      <div class="flex grow flex-col">
        Settings
        <span class="text-xs font-light">App config</span>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
    <Anchor route="about" class="grow basis-48" style="view-transition-name:about">
      <InfoIcon class="text-theme" />
      <div class="flex grow flex-col">
        About
        <span class="text-xs font-light">Info, Guides</span>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
  </div>
</div>
