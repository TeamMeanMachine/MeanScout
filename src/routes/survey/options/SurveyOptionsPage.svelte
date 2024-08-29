<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Container from "$lib/components/Container.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { tbaAuthKeyStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import { tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";
  import DeleteSurveyDialog from "./DeleteSurveyDialog.svelte";
  import EditSurveyNameDialog from "./EditSurveyNameDialog.svelte";
  import EditSurveyTbaEventKeyDialog from "./EditSurveyTbaEventKeyDialog.svelte";
  import ExportSurveyDialog from "./ExportSurveyDialog.svelte";

  let {
    idb,
    surveyRecord,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  $effect(() => {
    idb.transaction("surveys", "readwrite").objectStore("surveys").put($state.snapshot(surveyRecord));
  });

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
  <h1>Options</h1>
</Header>

<Container direction="column" padding="large">
  <ExportSurveyDialog {surveyRecord} />
  <EditSurveyNameDialog bind:surveyRecord />
  {#if $tbaAuthKeyStore}
    <h2>The Blue Alliance</h2>
    <EditSurveyTbaEventKeyDialog bind:surveyRecord />
    {#if surveyRecord.tbaEventKey}
      <Button onclick={getMatchesFromTBAEvent}>
        <Container align="center" maxWidth>
          <Icon name="table-list" />
          <Container direction="column" gap="small">
            Get matches from TBA
            <small>Removes existing matches</small>
          </Container>
        </Container>
      </Button>
      <Button onclick={getTeamsFromTBAEvent}>
        <Container align="center" maxWidth>
          <Icon name="people-group" />
          <Container direction="column" gap="small">
            Get teams from TBA
            <small>Removes existing teams</small>
          </Container>
        </Container>
      </Button>
    {/if}
  {/if}

  <h2>Danger Zone</h2>
  <DeleteSurveyDialog {idb} {surveyRecord} />
</Container>
