<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ImportIcon,
    InfoIcon,
    PlusIcon,
    Settings2Icon,
    SettingsIcon,
    ShareIcon,
  } from "@lucide/svelte";
  import BulkExportDialog from "./BulkExportDialog.svelte";
  import Anchor from "$lib/components/Anchor.svelte";
  import NewSurveyDialog from "./NewSurveyDialog.svelte";
  import ImportConfigsDialog from "./ImportConfigsDialog.svelte";

  let {
    pageData,
  }: {
    pageData: CompPageData;
  } = $props();
</script>

<div class="flex flex-col gap-1">
  <div class="flex flex-col">
    <h2 class="font-bold">{pageData.compRecord.name}</h2>
    <span class="text-xs font-light">{pageData.compRecord.id}</span>
  </div>

  <Button
    onclick={() => {
      openDialog(BulkExportDialog, {
        comps: [pageData.compRecord],
        surveys: pageData.surveyRecords,
        fields: pageData.fieldRecords,
        entries: pageData.entryRecords,
      });
    }}
  >
    <ShareIcon class="text-theme" />
    <div class="flex flex-col">Export</div>
  </Button>
</div>

<div class="flex flex-col gap-1">
  <Button
    onclick={() => {
      openDialog(BulkExportDialog, {
        comps: [pageData.compRecord],
        surveys: pageData.surveyRecords,
        fields: pageData.fieldRecords,
      });
    }}
  >
    <ShareIcon class="text-theme" />
    <div class="flex flex-col">Export configs</div>
  </Button>

  <Button onclick={() => openDialog(ImportConfigsDialog, { ...pageData })}>
    <ImportIcon class="text-theme" />
    <div class="flex flex-col">Import configs</div>
  </Button>
</div>

<div class="flex flex-col gap-1">
  <Anchor route="comp/{pageData.compRecord.id}/admin">
    <Settings2Icon class="text-theme" />
    <div class="flex grow flex-col">Config</div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>

  {#if pageData.surveyRecords.length}
    {#each pageData.surveyRecords.toSorted((a, b) => a.name.localeCompare(b.name)) as survey (survey.id)}
      <Anchor route="survey/{survey.id}" class="flex-nowrap!">
        <div class="flex grow flex-wrap items-center justify-between gap-x-2">
          <span>{survey.name}</span>
          <span class="text-xs font-light">{survey.id}</span>
        </div>
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    {/each}
  {/if}

  <Button onclick={() => openDialog(NewSurveyDialog, { compId: pageData.compRecord.id })}>
    <PlusIcon class="text-theme" />
    <div class="flex flex-col">New survey</div>
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

  <Anchor route="" class="active:-left-0.5!">
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
