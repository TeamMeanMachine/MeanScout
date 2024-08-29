<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Container from "$lib/components/Container.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Entry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { MatchSurvey } from "$lib/survey";
  import DeleteMatchDialog from "./DeleteMatchDialog.svelte";
  import MatchDialog from "./MatchDialog.svelte";

  let {
    idb,
    surveyRecord,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<MatchSurvey>;
  } = $props();

  $effect(() => {
    idb.transaction("surveys", "readwrite").objectStore("surveys").put($state.snapshot(surveyRecord));
  });

  let matchDialog: MatchDialog | undefined = $state();

  let show = $state(false);

  let entryRecords = $state<IDBRecord<Entry>[]>([]);

  const entriesRequest = idb.transaction("entries").objectStore("entries").index("surveyId").getAll(surveyRecord.id);
  entriesRequest.onerror = () => (show = true);

  entriesRequest.onsuccess = () => {
    const entries = entriesRequest.result;
    if (!entries) return;

    entryRecords = entries;
    show = true;
  };
</script>

<Header backLink="survey/{surveyRecord.id}">
  <small>{surveyRecord.name}</small>
  <h1>Matches</h1>
</Header>

<Container direction="column" padding="large">
  {#if $modeStore == "admin"}
    <MatchDialog bind:this={matchDialog} bind:surveyRecord />
  {/if}
</Container>

<Container direction="column" padding="large">
  {#if show && surveyRecord.matches.length}
    <Container>
      <table>
        <thead>
          <tr>
            <th colspan={$modeStore == "admin" ? 2 : 1} class="match-number">Match</th>
            <th colspan="3">Teams</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each surveyRecord.matches.toSorted((a, b) => a.number - b.number) as match}
            {@const entry = entryRecords.find((e) => e.type == "match" && e.match == match.number)}
            <tr>
              {#if $modeStore == "admin"}
                <td>
                  <Container padding="small" gap="small">
                    <Button onclick={() => matchDialog?.editMatch(match.number)}>
                      <Icon name="pen" />
                    </Button>
                    <DeleteMatchDialog bind:surveyRecord {match} />
                  </Container>
                </td>
              {/if}
              <td class="match-number">{match.number}</td>
              <td>
                <Container direction="column" padding="small" gap="small">
                  <small class="red-team">{match.red1}</small>
                  <small class="blue-team">{match.blue1}</small>
                </Container>
              </td>
              <td>
                <Container direction="column" padding="small" gap="small">
                  <small class="red-team">{match.red2}</small>
                  <small class="blue-team">{match.blue2}</small>
                </Container>
              </td>
              <td>
                <Container direction="column" padding="small" gap="small">
                  <small class="red-team">{match.red3}</small>
                  <small class="blue-team">{match.blue3}</small>
                </Container>
              </td>
              <td class="status">
                {#if entry}
                  <small>{entry.status}</small>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Container>
  {:else if show}
    <span>No matches.</span>
  {:else}
    <span>Loading...</span>
  {/if}
</Container>

<style>
  table {
    border-collapse: collapse;
  }

  td.match-number,
  .status {
    padding: var(--outer-gap);
  }

  .match-number,
  .red-team,
  .blue-team {
    text-align: right;
  }

  td .red-team {
    color: var(--red);
  }

  td .blue-team {
    color: var(--blue);
  }

  .status {
    text-align: center;
    text-transform: capitalize;
  }
</style>
