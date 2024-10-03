<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import ImportSurveyDialog from "$lib/dialogs/ImportSurveyDialog.svelte";
  import NewSurveyDialog from "$lib/dialogs/NewSurveyDialog.svelte";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecords,
  }: {
    idb: IDBDatabase;
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

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Options</h2>
  {#if $modeStore == "admin"}
    <NewSurveyDialog {idb} />
    <ImportSurveyDialog {idb} />
  {/if}
  <Anchor route="settings">
    <Icon name="gears" />
    <div class="flex grow flex-col">
      Settings
      <small>Mode, Target, TBA setup</small>
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
