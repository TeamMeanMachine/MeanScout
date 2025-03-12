<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import ImportSurveyDialog from "$lib/dialogs/ImportSurveyDialog.svelte";
  import NewSurveyDialog from "$lib/dialogs/NewSurveyDialog.svelte";
  import { cameraStore, modeStore } from "$lib/settings";
  import { ArrowRightIcon, ImportIcon, InfoIcon, PlusIcon, SettingsIcon } from "@lucide/svelte";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();
</script>

<Header />

<div class="flex flex-col gap-2">
  <h2 class="font-bold">Surveys</h2>

  {#if data.surveys.length}
    {#each data.surveys.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as survey (survey.id)}
      <Anchor route="survey/{survey.id}">
        <div class="grow">{survey.name}</div>
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    {/each}
  {/if}

  {#if $modeStore == "admin"}
    <div class="flex flex-wrap gap-2">
      <Button onclick={() => openDialog(ImportSurveyDialog, {})} class="grow basis-0">
        <ImportIcon class="text-theme" />
        <div class="flex flex-col">
          Import
          <small>
            {#if $cameraStore && DecompressionStream}
              QRF code, File
            {:else}
              File
            {/if}
          </small>
        </div>
      </Button>
      <Button onclick={() => openDialog(NewSurveyDialog, {})} class="grow basis-0">
        <PlusIcon class="text-theme" />
        <div class="flex flex-col">
          Create
          <small>New</small>
        </div>
      </Button>
    </div>
  {/if}
</div>

<div class="flex flex-col gap-2" style="view-transition-name:meanscout">
  <h2 class="font-bold">MeanScout</h2>
  <Anchor route="settings" style="view-transition-name:settings">
    <SettingsIcon class="text-theme" />
    <div class="flex grow flex-col">
      Settings
      <small>App config</small>
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
  <Anchor route="about" style="view-transition-name:about">
    <InfoIcon class="text-theme" />
    <div class="flex grow flex-col">
      About
      <small>Info, Guides</small>
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
</div>
