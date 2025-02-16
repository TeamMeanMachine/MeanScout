<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import EditSurveyNameDialog from "$lib/dialogs/EditSurveyNameDialog.svelte";
  import EditSurveyTbaEventKeyDialog from "$lib/dialogs/EditSurveyTbaEventKeyDialog.svelte";
  import { objectStore } from "$lib/idb";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";
  import type { PageData } from "./$types";
  import AdminHeader from "./AdminHeader.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  async function getMatchesFromTBAEvent() {
    if (!data.surveyRecord.tbaEventKey) return;

    const response = await tbaGetEventMatches(data.surveyRecord.tbaEventKey);
    if (response) {
      data = {
        ...data,
        surveyRecord: { ...data.surveyRecord, matches: response, modified: new Date() },
      } as PageData;
      objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
    }
  }

  async function getTeamsFromTBAEvent() {
    if (!data.surveyRecord.tbaEventKey) return;

    const response = await tbaGetEventTeams(data.surveyRecord.tbaEventKey);
    if (response) {
      data = {
        ...data,
        surveyRecord: { ...data.surveyRecord, teams: response, modified: new Date() },
      } as PageData;
      objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
    }
  }
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="general" />

  <div class="flex flex-col gap-2">
    <Button
      onclick={() =>
        openDialog(EditSurveyNameDialog, {
          surveyRecord: data.surveyRecord,
          onedit(name) {
            data = {
              ...data,
              surveyRecord: { ...data.surveyRecord, name, modified: new Date() },
            } as PageData;
            objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
          },
        })}
    >
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
      <Button
        onclick={() =>
          openDialog(EditSurveyTbaEventKeyDialog, {
            surveyRecord: data.surveyRecord,
            onedit(tbaEventKey) {
              data = {
                ...data,
                surveyRecord: { ...data.surveyRecord, tbaEventKey, modified: new Date() },
              } as PageData;
              objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
            },
          })}
      >
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
</div>
