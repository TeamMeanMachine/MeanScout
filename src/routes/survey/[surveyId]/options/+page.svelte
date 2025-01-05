<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import DeleteSurveyDialog from "$lib/dialogs/DeleteSurveyDialog.svelte";
  import EditSurveyNameDialog from "$lib/dialogs/EditSurveyNameDialog.svelte";
  import EditSurveyTbaEventKeyDialog from "$lib/dialogs/EditSurveyTbaEventKeyDialog.svelte";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  async function getMatchesFromTBAEvent() {
    if (data.surveyRecord.type != "match") return;
    if (!data.surveyRecord.tbaEventKey) return;

    const response = await tbaGetEventMatches(data.surveyRecord.tbaEventKey, $tbaAuthKeyStore);
    if (response) {
      data.surveyRecord.matches = response;
      data.surveyRecord.modified = new Date();
    }
  }

  async function getTeamsFromTBAEvent() {
    if (!data.surveyRecord.tbaEventKey) return;

    const response = await tbaGetEventTeams(data.surveyRecord.tbaEventKey, $tbaAuthKeyStore);
    if (response) {
      data.surveyRecord.teams = response;
      data.surveyRecord.modified = new Date();
    }
  }
</script>

<Header
  title="Options - {data.surveyRecord.name} - MeanScout"
  heading={[
    { type: "sm", text: data.surveyRecord.name },
    { type: "h1", text: "Options" },
  ]}
  backLink="survey/{data.surveyRecord.id}"
/>

<div class="flex flex-col gap-2">
  <Button onclick={() => openDialog(EditSurveyNameDialog, { surveyRecord: data.surveyRecord })}>
    <Icon name="pen" />
    <div class="flex flex-col">
      {data.surveyRecord.name}
      <small>Edit name</small>
    </div>
  </Button>
</div>

{#if $tbaAuthKeyStore}
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">The Blue Alliance</h2>
    <Button onclick={() => openDialog(EditSurveyTbaEventKeyDialog, { surveyRecord: data.surveyRecord })}>
      <Icon name="calendar-days" />
      {#if data.surveyRecord.tbaEventKey}
        <div class="flex flex-col">
          {data.surveyRecord.tbaEventKey}
          <small>Edit event</small>
        </div>
      {:else}
        Add event
      {/if}
    </Button>
    {#if data.surveyRecord.tbaEventKey}
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

<div class="flex flex-col gap-2">
  <h2 class="font-bold">Danger Zone</h2>
  <Button onclick={() => openDialog(DeleteSurveyDialog, { surveyRecord: data.surveyRecord })}>
    <Icon name="trash" />
    Delete survey
  </Button>
</div>
