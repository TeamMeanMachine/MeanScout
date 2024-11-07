<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import ImportSurveyFromFileDialog from "$lib/dialogs/ImportSurveyFromFileDialog.svelte";
  import ImportSurveyFromQRCodeDialog from "$lib/dialogs/ImportSurveyFromQRCodeDialog.svelte";
  import NewSurveyDialog from "$lib/dialogs/NewSurveyDialog.svelte";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecords,
  }: {
    surveyRecords: IDBRecord<Survey>[];
  } = $props();
</script>

<Header />

{#if surveyRecords.length}
  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Surveys</h2>
    {#each surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as survey (survey.id)}
      <Anchor route="survey/{survey.id}">
        <div class="grow">{survey.name}</div>
        <Icon name="arrow-right" />
      </Anchor>
    {/each}
  </div>
{/if}

{#if $modeStore == "admin"}
  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Add survey</h2>
    <Button onclick={() => openDialog(NewSurveyDialog, {})}>
      <Icon name="plus" />
      <div class="flex flex-col">
        Create new
        <small>From scratch</small>
      </div>
    </Button>
    <Button onclick={() => openDialog(ImportSurveyFromQRCodeDialog, {})}>
      <Icon name="qrcode" />
      <div class="flex flex-col">
        Import
        <small>From QR code</small>
      </div>
    </Button>
    <Button onclick={() => openDialog(ImportSurveyFromFileDialog, {})}>
      <Icon name="paste" />
      <div class="flex flex-col">
        Import
        <small>From file</small>
      </div>
    </Button>
  </div>
{/if}

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Options</h2>
  <Anchor route="settings">
    <Icon name="gears" />
    <div class="flex grow flex-col">
      Settings
      <small>Mode, Target, Camera, TBA</small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>
  <Anchor route="about">
    <Icon name="info-circle" />
    <div class="flex grow flex-col">
      About
      <small>Guides, Info</small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>
</div>
