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
  import type { CompPageData } from "$lib/comp";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import FetchTbaDataButton from "$lib/components/FetchTbaDataButton.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import BulkExportDialog from "./BulkExportDialog.svelte";
  import BulkImportDialog from "./BulkImportDialog.svelte";
  import NewSurveyDialog from "./NewSurveyDialog.svelte";

  let {
    pageData,
  }: {
    pageData: CompPageData;
  } = $props();

  const { responseCount, requestAllCount, requestConfigsCount, requestEntriesCount } = $derived.by(() => {
    const messages = Object.groupBy(onlineTransfer.rtcMessages, (m) => {
      if (m.type == "response") return "response";
      return m.request;
    });
    return {
      responseCount: messages.response?.length || 0,
      requestAllCount: messages.all?.length || 0,
      requestConfigsCount: messages.configs?.length || 0,
      requestEntriesCount: messages.entries?.length || 0,
    };
  });
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
  <div class="flex flex-col">
    <h2 class="font-bold">Send/Receive</h2>
    <span class="text-xs font-light">Via room, QRF code, file</span>
  </div>

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
    <ShareIcon class="text-theme" />
    <div class={["flex flex-col", requestAllCount ? "animate-pulse" : "animate-none"]}>
      Send all
      <span class="text-xs font-light">Configs and entries</span>
    </div>
    {#if requestAllCount}
      <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
        {requestAllCount}
      </span>
    {/if}
  </Button>

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
    class="relative text-sm"
  >
    <div class="w-6 shrink-0"></div>
    <span class={requestConfigsCount ? "animate-pulse" : "animate-none"}>Just configs</span>
    {#if requestConfigsCount}
      <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
        {requestConfigsCount}
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
    class="relative text-sm"
  >
    <div class="w-6 shrink-0"></div>
    <span class={requestEntriesCount ? "animate-pulse" : "animate-none"}>Just entries</span>
    {#if requestEntriesCount}
      <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
        {requestEntriesCount}
      </span>
    {/if}
  </Button>
</div>

<div class="flex flex-col gap-1">
  <Button
    onclick={() => {
      openDialog(BulkImportDialog, {
        request: "all",
        existing: pageData.all,
      });
    }}
    class="relative"
  >
    <DownloadIcon class={["text-theme", responseCount ? "animate-bounce-down" : "animate-none"]} />
    <div class={["flex flex-col", responseCount ? "animate-pulse" : "animate-none"]}>
      Receive
      <span class="text-xs font-light">Configs or entries</span>
    </div>
    {#if responseCount}
      <span class="absolute top-0 left-0.5 text-xs font-bold tracking-tighter italic">
        {responseCount}
      </span>
    {/if}
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

  {#each pageData.surveyRecords.toSorted((a, b) => a.name.localeCompare(b.name)) as survey (survey.id)}
    <Anchor route="survey/{survey.id}">
      <div class="w-6 shrink-0"></div>
      <div class="flex grow flex-col">
        <span class="text-sm">{survey.name}</span>
        <span class="text-xs font-light">Fields{survey.type == "match" ? ", ranks" : ""}</span>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
  {/each}

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

  <Anchor route="">
    <ArrowLeftIcon class="text-theme" />
    <div class="flex grow flex-col">Main page</div>
  </Anchor>

  <Anchor route="webrtc">
    <ChevronsLeftRightEllipsisIcon class={["text-theme", onlineTransfer.localId ? "animate-pulse" : ""]} />
    <div class="flex grow flex-col">
      {#if onlineTransfer.localId}
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
