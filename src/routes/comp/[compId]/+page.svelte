<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import ImportSurveyDialog from "$lib/dialogs/ImportSurveyDialog.svelte";
  import NewSurveyDialog from "$lib/dialogs/NewSurveyDialog.svelte";
  import { cameraStore } from "$lib/settings";
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ImportIcon,
    InfoIcon,
    PlusIcon,
    ReplaceIcon,
    Settings2Icon,
    SettingsIcon,
    ShareIcon,
  } from "@lucide/svelte";
  import type { PageData } from "./$types";
  import OverwriteCompDialog from "$lib/dialogs/OverwriteCompDialog.svelte";
  import ExportCompDialog from "$lib/dialogs/ExportCompDialog.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();
</script>

<Header title="{data.compRecord.name} - MeanScout" heading={data.compRecord.name} />

<div class="flex flex-col gap-2" style="view-transition-name:surveys">
  <h2 class="font-bold">Surveys</h2>

  {#if data.surveyRecords.length}
    {#each data.surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as survey (survey.id)}
      <Anchor route="survey/{survey.id}">
        <div class="grow">{survey.name}</div>
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    {/each}
  {/if}

  <div class="flex flex-wrap gap-2">
    <Button onclick={() => openDialog(ImportSurveyDialog, { compId: data.compRecord.id })} class="grow basis-0">
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
    <Button onclick={() => openDialog(NewSurveyDialog, { compId: data.compRecord.id })} class="grow basis-0">
      <PlusIcon class="text-theme" />
      <div class="flex flex-col">
        Create
        <span class="text-xs font-light">New</span>
      </div>
    </Button>
  </div>
</div>

<div class="flex flex-col gap-2" style="view-transition-name:comp">
  <h2 class="font-bold">{data.compRecord.name}</h2>

  <div class="flex flex-wrap gap-2">
    <Button
      onclick={() => {
        openDialog(ExportCompDialog, {
          compRecord: data.compRecord,
        });
      }}
      class="grow basis-0"
    >
      <ShareIcon class="text-theme" />
      <div class="flex flex-col">
        Export
        <span class="text-xs font-light">QRF code, File</span>
      </div>
    </Button>
    <Button
      onclick={() => {
        openDialog(OverwriteCompDialog, {
          compRecord: data.compRecord,
        });
      }}
      class="grow basis-0"
    >
      <ReplaceIcon class="text-theme" />
      <div class="flex flex-col">
        Overwrite
        <span class="text-xs font-light">
          {#if $cameraStore}
            QRF code, File
          {:else}
            File
          {/if}
        </span>
      </div>
    </Button>
  </div>
  <Anchor route="comp/{data.compRecord.id}/admin" style="view-transition-name:admin-comp">
    <Settings2Icon class="text-theme" />
    <div class="flex grow flex-col">
      Admin
      <span class="text-xs font-light">Setup, Configure</span>
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
</div>

<div class="flex flex-col gap-2" style="view-transition-name:meanscout">
  <h2 class="font-bold">MeanScout</h2>
  <Anchor route="" class="active:-left-0.5!">
    <ArrowLeftIcon class="text-theme" />
    <div class="flex grow flex-col">
      Main page
      <span class="text-xs font-light">Switch comp</span>
    </div>
  </Anchor>
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
