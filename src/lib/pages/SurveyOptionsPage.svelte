<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteSurveyDialog from "$lib/dialogs/DeleteSurveyDialog.svelte";
  import EditSurveyNameDialog from "$lib/dialogs/EditSurveyNameDialog.svelte";
  import EditSurveyTbaEventKeyDialog from "$lib/dialogs/EditSurveyTbaEventKeyDialog.svelte";
  import ExportSurveyDialog from "$lib/dialogs/ExportSurveyDialog.svelte";
  import { tbaAuthKeyStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import { tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";

  let {
    surveyRecord,
  }: {
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  async function getMatchesFromTBAEvent() {
    if (surveyRecord.type != "match") return;
    if (!surveyRecord.tbaEventKey) return;

    const response = await tbaGetEventMatches(surveyRecord.tbaEventKey, $tbaAuthKeyStore);
    if (response) {
      surveyRecord.matches = response;
      surveyRecord.modified = new Date();
    }
  }

  async function getTeamsFromTBAEvent() {
    if (!surveyRecord.tbaEventKey) return;

    const response = await tbaGetEventTeams(surveyRecord.tbaEventKey, $tbaAuthKeyStore);
    if (response) {
      surveyRecord.teams = response;
      surveyRecord.modified = new Date();
    }
  }
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1 class="font-bold">Options</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  <Button onclick={() => openDialog(ExportSurveyDialog, { surveyRecord })}>
    <Icon name="share-from-square" />
    Export survey
  </Button>
  <Button onclick={() => openDialog(EditSurveyNameDialog, { surveyRecord })}>
    <Icon name="pen" />
    <div class="flex flex-col">
      {surveyRecord.name}
      <small>Edit name</small>
    </div>
  </Button>
</div>

{#if $tbaAuthKeyStore}
  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">The Blue Alliance</h2>
    <Button onclick={() => openDialog(EditSurveyTbaEventKeyDialog, { surveyRecord })}>
      <Icon name="calendar-days" />
      {#if surveyRecord.tbaEventKey}
        <div class="flex flex-col">
          {surveyRecord.tbaEventKey}
          <small>Edit event</small>
        </div>
      {:else}
        Add event
      {/if}
    </Button>
    {#if surveyRecord.tbaEventKey}
      <Button onclick={getMatchesFromTBAEvent}>
        <Icon name="table-list" />
        <div class="flex flex-col">
          Get matches from TBA
          <small>Removes existing matches</small>
        </div>
      </Button>
      <Button onclick={getTeamsFromTBAEvent}>
        <Icon name="people-group" />
        <div class="flex flex-col">
          Get teams from TBA
          <small>Removes existing teams</small>
        </div>
      </Button>
    {/if}
  </div>
{/if}

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Danger Zone</h2>
  <Button onclick={() => openDialog(DeleteSurveyDialog, { surveyRecord })}>
    <Icon name="trash" />
    Delete survey
  </Button>
</div>
