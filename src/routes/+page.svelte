<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import NewCompDialog from "$lib/dialogs/NewCompDialog.svelte";
  import { cameraStore } from "$lib/settings";
  import { ArrowRightIcon, ImportIcon, InfoIcon, PlusIcon, SettingsIcon } from "@lucide/svelte";
  import type { PageData } from "./$types";
  import ImportCompDialog from "$lib/dialogs/ImportCompDialog.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();
</script>

<Header />

<div class="flex flex-col gap-2" style="view-transition-name:comps">
  <h2 class="font-bold">Comps</h2>

  {#if data.compRecords.length}
    {#each data.compRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as comp (comp.id)}
      <Anchor route="comp/{comp.id}">
        <div class="grow">{comp.name}</div>
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    {/each}
  {/if}

  <div class="flex flex-wrap gap-2">
    <Button onclick={() => openDialog(ImportCompDialog, {})} class="grow basis-0">
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
    <Button onclick={() => openDialog(NewCompDialog, {})} class="grow basis-0">
      <PlusIcon class="text-theme" />
      <div class="flex flex-col">
        Create
        <span class="text-xs font-light">New</span>
      </div>
    </Button>
  </div>
</div>

<div class="flex flex-col gap-2" style="view-transition-name:meanscout">
  <h2 class="font-bold">MeanScout</h2>
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
  <span class="text-sm" style="view-transition-name:meanscout-version">
    {import.meta.env.VITE_GIT_COMMIT_HASH}
    <span class="text-xs">({new Date(import.meta.env.VITE_GIT_COMMIT_DATE).toLocaleDateString()})</span>
  </span>
</div>
