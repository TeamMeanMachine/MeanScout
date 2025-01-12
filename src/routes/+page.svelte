<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import ImportSurveyFromFileDialog from "$lib/dialogs/ImportSurveyFromFileDialog.svelte";
  import ImportSurveyFromQrCodeDialog from "$lib/dialogs/ImportSurveyFromQRCodeDialog.svelte";
  import NewSurveyDialog from "$lib/dialogs/NewSurveyDialog.svelte";
  import { cameraStore, modeStore } from "$lib/settings";
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
        <Icon name="arrow-right" />
      </Anchor>
    {/each}
  {/if}

  {#if $modeStore == "admin"}
    <div class="flex flex-wrap gap-2">
      {#if $cameraStore}
        <Button onclick={() => openDialog(ImportSurveyFromQrCodeDialog, {})} class="grow basis-0">
          <Icon name="qrcode" />
          <div class="flex flex-col">
            Import
            <small>QRF code</small>
          </div>
        </Button>
      {/if}
      <Button onclick={() => openDialog(ImportSurveyFromFileDialog, {})} class="grow basis-0">
        <Icon name="paste" />
        <div class="flex flex-col">
          Import
          <small>File</small>
        </div>
      </Button>
      <Button onclick={() => openDialog(NewSurveyDialog, {})} class="grow basis-0">
        <Icon name="plus" />
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
    <Icon name="gears" />
    <div class="flex grow flex-col">
      Settings
      <small>App config</small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>
  <Anchor route="about" style="view-transition-name:about">
    <Icon name="info-circle" />
    <div class="flex grow flex-col">
      About
      <small>Info, Guides</small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>
</div>
