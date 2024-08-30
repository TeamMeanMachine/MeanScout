<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import ImportSurveyDialog from "./ImportSurveyDialog.svelte";
  import NewSurveyDialog from "./NewSurveyDialog.svelte";

  let {
    idb,
  }: {
    idb: IDBDatabase;
  } = $props();

  let surveyRecords = $state<IDBRecord<Survey>[]>([]);

  const surveysRequest = idb.transaction("surveys").objectStore("surveys").getAll();
  surveysRequest.onsuccess = () => {
    surveyRecords = surveysRequest.result ?? [];
  };
</script>

<Header />

{#if surveyRecords.length}
  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Surveys</h2>
    {#each surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as survey (survey.id)}
      <Anchor route="survey/{survey.id}">
        <Icon name="arrow-right" />
        <div class="flex flex-col">
          {survey.name}
          {#if survey.tbaEventKey?.length}
            <small>{survey.tbaEventKey}</small>
          {/if}
        </div>
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
    <div class="flex flex-col">
      Settings
      <small>Mode, Target, TBA setup</small>
    </div>
  </Anchor>
  <Anchor route="about">
    <Icon name="info-circle" />
    <div class="flex flex-col">
      About
      <small>Guides, Info</small>
    </div>
  </Anchor>
</div>
