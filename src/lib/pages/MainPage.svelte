<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
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

{#if surveyRecords.length}
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Surveys</h2>
    {#each surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as survey (survey.id)}
      <Anchor route="survey/{survey.id}">
        <div class="grow">{survey.name}</div>
        <Icon name="arrow-right" />
      </Anchor>
    {/each}
  </div>
{/if}

<div class="flex flex-col gap-2">
  <h2 class="font-bold">Options</h2>

  {#if $modeStore == "admin"}
    <div class="flex flex-wrap gap-2">
      <Button onclick={() => openDialog(ImportSurveyFromQRCodeDialog, {})} class="grow basis-0">
        <Icon name="qrcode" />
        <div class="flex flex-col">
          Import
          <small>QR code</small>
        </div>
      </Button>
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
