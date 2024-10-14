<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import NewEntryDialog from "$lib/dialogs/NewEntryDialog.svelte";
  import type { Entry } from "$lib/entry";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    idb,
    surveyRecord,
    entryRecords,
  }: {
    idb: IDBDatabase;
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  const drafts = entryRecords
    .filter((entry) => entry.status == "draft")
    .toSorted((a, b) => b.modified.getTime() - a.modified.getTime());
</script>

<Header backLink="">
  <h1 class="font-bold">{surveyRecord.name}</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  <NewEntryDialog {idb} bind:surveyRecord {entryRecords} />
</div>

{#if drafts.length}
  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Drafts</h2>
    {#each drafts as draft (draft.id)}
      <Anchor route="entry/{draft.id}">
        <div class="flex grow flex-col">
          <span><small>Team</small> {draft.team}</span>
          {#if draft.type == "match"}
            <span><small>Match</small> {draft.match}</span>
          {/if}
        </div>
        <Icon name="arrow-right" />
      </Anchor>
    {/each}
  </div>
{/if}

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Survey</h2>

  <Anchor route="survey/{surveyRecord.id}/entries">
    <Icon name="list-ol" />
    <div class="flex grow flex-col">
      Entries
      <small>{entryRecords.length - drafts.length} completed</small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>

  {#if surveyRecord.type == "match"}
    {@const matchesScouted = surveyRecord.matches.filter((match) => {
      const teams = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
      return entryRecords.find(
        (e) => e.type == "match" && e.status != "draft" && teams.includes(e.team) && e.match == match.number,
      );
    }).length}

    <Anchor route="survey/{surveyRecord.id}/analysis">
      <Icon name="chart-simple" />
      <div class="flex grow flex-col">
        Analysis
        <small>
          {surveyRecord.pickLists.length} pick {surveyRecord.pickLists.length == 1 ? "list" : "lists"},
          {surveyRecord.expressions.length}
          {surveyRecord.expressions.length == 1 ? "expression" : "expressions"}
        </small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>

    <Anchor route="survey/{surveyRecord.id}/matches">
      <Icon name="table-list" />
      <div class="flex grow flex-col">
        Matches
        <small>
          {#if matchesScouted > 0}
            {matchesScouted} scouted,
          {/if}
          {surveyRecord.matches.length} total
        </small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>
  {/if}

  <Anchor route="survey/{surveyRecord.id}/teams">
    <Icon name="people-group" />
    <div class="flex grow flex-col">
      Teams
      <small>
        {#if surveyRecord.type == "match"}
          {@const teamCountFromMatches = [
            ...new Set(
              surveyRecord.matches.flatMap((match) => [
                match.red1,
                match.red2,
                match.red3,
                match.blue1,
                match.blue2,
                match.blue3,
              ]),
            ),
          ].length}
          {teamCountFromMatches} from matches,
        {/if}
        {surveyRecord.teams.length} custom
      </small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>

  {#if $modeStore == "admin"}
    <Anchor route="survey/{surveyRecord.id}/fields">
      <Icon name="list-check" />
      <div class="flex grow flex-col">
        Fields
        <small>
          {#if surveyRecord.expressions.length == 0 && surveyRecord.pickLists.length == 0 && entryRecords.length == 0}
            Configure,
          {/if}
          Preview
        </small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>

    <Anchor route="survey/{surveyRecord.id}/options">
      <Icon name="gears" />
      <div class="flex grow flex-col">
        Options
        <small>Export, TBA event</small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>
  {/if}
</div>
