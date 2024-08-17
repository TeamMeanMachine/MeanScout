<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Container from "$lib/components/Container.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";
  import NewEntryDialog from "./NewEntryDialog.svelte";

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

  let entryRecords = $state<IDBRecord<Entry>[]>([]);
  let draftEntries = $state<IDBRecord<Entry>[]>([]);
  let show = $state(false);

  const entriesRequest = idb.transaction("entries").objectStore("entries").index("surveyId").getAll(surveyRecord.id);
  entriesRequest.onerror = () => (show = true);

  entriesRequest.onsuccess = () => {
    const entries = entriesRequest.result;
    if (!entries) return;

    entryRecords = entries;
    draftEntries = entries.filter((entry) => entry.status == "draft");

    show = true;
  };

  function getTeamsFromAllMatches() {
    if (surveyRecord.type != "match") return [];

    let teams = new Set<string>();
    for (const match of surveyRecord.matches) {
      teams.add(match.red1);
      teams.add(match.red2);
      teams.add(match.red3);
      teams.add(match.blue1);
      teams.add(match.blue2);
      teams.add(match.blue3);
    }
    return [...teams];
  }
</script>

<Header backLink="" title={surveyRecord.name} iconName="list-ul" />

<Container direction="column" padding="large">
  {#if show}
    <NewEntryDialog {idb} bind:surveyRecord {entryRecords} />
  {/if}
</Container>

{#if show && draftEntries.length}
  <Container direction="column" padding="large">
    <h2>Drafts</h2>
    {#each draftEntries.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as draft (draft.id)}
      <Anchor route="entry/{draft.id}">
        <Container align="center" maxWidth spaceBetween>
          <Container direction="column" gap="small">
            <span><small>Team</small> {draft.team}</span>
            {#if draft.type == "match"}
              <span><small>Match</small> {draft.match}</span>
            {/if}
          </Container>
          <Icon name="arrow-right" />
        </Container>
      </Anchor>
    {/each}
  </Container>
{/if}

<Container direction="column" padding="large">
  <h2>Survey</h2>
  <Anchor route="survey/{surveyRecord.id}/entries">
    <Container align="center" maxWidth spaceBetween>
      <Container align="center">
        <Icon name="list-ol" />
        <Container direction="column" gap="small">
          Entries
          <small>{entryRecords.length - draftEntries.length} completed. View, Edit, Export, Import</small>
        </Container>
      </Container>
      <Icon name="arrow-right" />
    </Container>
  </Anchor>
  {#if surveyRecord.type == "match"}
    <Anchor route="survey/{surveyRecord.id}/analysis">
      <Container align="center" maxWidth spaceBetween>
        <Container align="center">
          <Icon name="chart-simple" />
          <Container direction="column" gap="small">
            Analysis
            <small>{surveyRecord.pickLists.length} pick lists, {surveyRecord.expressions.length} expressions</small>
          </Container>
        </Container>
        <Icon name="arrow-right" />
      </Container>
    </Anchor>
  {/if}
  {#if $modeStore == "admin"}
    <Anchor route="survey/{surveyRecord.id}/fields">
      <Container align="center" maxWidth spaceBetween>
        <Container align="center">
          <Icon name="list-check" />
          <Container direction="column" gap="small">
            Fields
            <small>Configure, Preview</small>
          </Container>
        </Container>
        <Icon name="arrow-right" />
      </Container>
    </Anchor>
    {#if surveyRecord.type == "match"}
      <Anchor route="survey/{surveyRecord.id}/matches">
        <Container align="center" maxWidth spaceBetween>
          <Container align="center">
            <Icon name="table-list" />
            <Container direction="column" gap="small">
              Matches
              <small>{surveyRecord.matches.length} total</small>
            </Container>
          </Container>
          <Icon name="arrow-right" />
        </Container>
      </Anchor>
    {/if}
    <Anchor route="survey/{surveyRecord.id}/teams">
      <Container align="center" maxWidth spaceBetween>
        <Container align="center">
          <Icon name="people-group" />
          <Container direction="column" gap="small">
            Teams
            <small>
              {#if surveyRecord.type == "match"}
                {getTeamsFromAllMatches().length} from matches,
              {/if}
              {surveyRecord.teams.length} added
            </small>
          </Container>
        </Container>
        <Icon name="arrow-right" />
      </Container>
    </Anchor>
    <Anchor route="survey/{surveyRecord.id}/options">
      <Container align="center" maxWidth spaceBetween>
        <Container align="center">
          <Icon name="gears" />
          <Container direction="column" gap="small">
            Options
            <small>Export, TBA event</small>
          </Container>
        </Container>
        <Icon name="arrow-right" />
      </Container>
    </Anchor>
  {/if}
</Container>
