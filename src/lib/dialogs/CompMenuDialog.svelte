<script lang="ts">
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChevronsLeftRightEllipsisIcon,
    DownloadIcon,
    InfoIcon,
    PlusIcon,
    Settings2Icon,
    SettingsIcon,
    ShareIcon,
    XIcon,
  } from "@lucide/svelte";
  import type { Comp, CompPageData } from "$lib/comp";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import FetchTbaDataButton from "$lib/components/FetchTbaDataButton.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import BulkExportDialog from "./BulkExportDialog.svelte";
  import ImportConfigsDialog from "./ImportConfigsDialog.svelte";
  import NewSurveyDialog from "./NewSurveyDialog.svelte";

  let {
    pageData,
  }: {
    pageData: CompPageData & { otherComps: Comp[] };
  } = $props();
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <div class="flex flex-col">
    <h2 class="font-bold">{pageData.compRecord.name}</h2>
    <span class="text-xs font-light">{pageData.compRecord.id}</span>
  </div>
  <Button onclick={closeDialog}>
    <XIcon class="text-theme" />
  </Button>
</div>

{#if pageData.compRecord.tbaEventKey}
  <FetchTbaDataButton {pageData} />
{/if}

<div class="flex flex-col gap-1">
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
    <div class="flex flex-col">
      Send all
      <span class="text-xs font-light">Comp, surveys, entries</span>
    </div>
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
    <div class="flex flex-col">Send configs</div>
  </Button>

  <Button onclick={() => openDialog(ImportConfigsDialog, { ...pageData })}>
    <DownloadIcon class="text-theme" />
    <div class="flex flex-col">Receive configs</div>
  </Button>
</div>

<div class="flex flex-col gap-1">
  <div class="flex flex-col">
    <h2 class="font-bold">Manage</h2>
    <span class="text-xs font-light">Comp, surveys</span>
  </div>

  <Anchor route="comp/{pageData.compRecord.id}/admin">
    <Settings2Icon class="text-theme" />
    <div class="flex grow flex-col">
      {pageData.compRecord.name}
      <span class="text-xs font-light">Scouts, matches, teams</span>
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>

  {#if pageData.surveyRecords.length}
    {#each pageData.surveyRecords.toSorted((a, b) => a.name.localeCompare(b.name)) as survey (survey.id)}
      <Anchor route="survey/{survey.id}">
        <div class="flex grow flex-col">
          <span>{survey.name}</span>
          <span class="text-xs font-light">Fields{survey.type == "match" ? ", ranks" : ""}</span>
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

{#if pageData.otherComps.length}
  <div class="flex flex-col gap-1">
    <div class="flex flex-col">
      <h2 class="font-bold">Other Comps</h2>
    </div>

    {#each pageData.otherComps.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as comp (comp.id)}
      <Anchor route="comp/{comp.id}">
        <div class="flex grow flex-col">
          <span>{comp.name}</span>
          <span class="text-xs font-light">{comp.id}</span>
        </div>
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    {/each}
  </div>
{/if}

<div class="flex flex-col gap-1">
  <div class="flex flex-col">
    <h2 class="font-bold">MeanScout</h2>
    <span class="text-xs font-light">
      {import.meta.env.VITE_GIT_COMMIT_HASH}
      ({new Date(import.meta.env.VITE_GIT_COMMIT_DATE).toLocaleDateString()})
    </span>
  </div>

  <Anchor route="">
    <ArrowLeftIcon class="text-theme" />
    <div class="flex grow flex-col">Main page</div>
  </Anchor>

  <Anchor route="webrtc">
    <ChevronsLeftRightEllipsisIcon class={["text-theme", onlineTransfer.signaling && "animate-pulse"]} />
    <div class="flex grow flex-col">
      {#if onlineTransfer.signaling}
        View room
      {:else}
        Join a room
      {/if}
    </div>
    <ArrowRightIcon class="text-theme" />
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
