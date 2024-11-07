<script lang="ts">
  import type { Match } from "$lib";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import ExportSurveyDialog from "$lib/dialogs/ExportSurveyDialog.svelte";
  import NewEntryDialog from "$lib/dialogs/NewEntryDialog.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import ViewPickListDialog from "$lib/dialogs/ViewPickListDialog.svelte";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { modeStore, targetStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    entryRecords,
  }: {
    surveyRecord: IDBRecord<Survey>;
    entryRecords: IDBRecord<Entry>[];
  } = $props();

  const drafts = entryRecords
    .filter((entry) => entry.status == "draft")
    .toSorted((a, b) => b.modified.getTime() - a.modified.getTime());

  const entriesByTeam = entryRecords.reduce(
    (acc, entry) => {
      if (entry.type != "match") return acc;

      if (entry.team in acc) {
        acc[entry.team].push(entry);
      } else {
        acc[entry.team] = [entry];
      }

      return acc;
    },
    {} as Record<string, IDBRecord<MatchEntry>[]>,
  );

  const prefilledMatch = getPrefilledMatch();
  const prefilledTeam = getPrefilledTeam(prefilledMatch);

  function getPrefilledMatch() {
    if (surveyRecord.type != "match") return 1;

    const recordedMatches = entryRecords.filter((entry) => entry.type == "match").map((entry) => entry.match);
    return 1 + Math.max(...recordedMatches, 0);
  }

  function getPrefilledTeam(matchValue: number) {
    if (surveyRecord.type != "match") return "";

    const matchData = surveyRecord.matches.find((match) => match.number == matchValue);
    if (!matchData) return "";

    switch ($targetStore) {
      case "red 1":
        return matchData.red1;
      case "red 2":
        return matchData.red2;
      case "red 3":
        return matchData.red3;
      case "blue 1":
        return matchData.blue1;
      case "blue 2":
        return matchData.blue2;
      case "blue 3":
        return matchData.blue3;
      default:
        return "";
    }
  }
</script>

<Header backLink="">
  <h1 class="font-bold">{surveyRecord.name}</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Entries</h2>

  <Button onclick={() => openDialog(NewEntryDialog, { surveyRecord, entryRecords, prefilledTeam, prefilledMatch })}>
    <Icon name="plus" />
    <div class="flex flex-col">
      {#if prefilledTeam.length}
        <span><small>Team</small> {prefilledTeam}</span>
      {/if}
      {#if surveyRecord.type == "match" && prefilledMatch}
        <span><small>Match</small> {prefilledMatch}</span>
      {/if}
    </div>
  </Button>

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

  <Anchor route="survey/{surveyRecord.id}/entries">
    <Icon name="list-ol" />
    <div class="flex grow flex-col">
      Entries
      <small>{entryRecords.length - drafts.length} completed</small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>
</div>

{#if surveyRecord.type == "match"}
  {@const matchesScouted = surveyRecord.matches.filter((match) => {
    const teams = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
    return entryRecords.find(
      (e) => e.type == "match" && e.status != "draft" && teams.includes(e.team) && e.match == match.number,
    );
  }).length}

  {@const upcomingMatches = surveyRecord.matches
    .filter((match) => !entryRecords.some((e) => e.status != "draft" && e.type == "match" && e.match == match.number))
    .toSorted((a, b) => a.number - b.number)
    .slice(0, 3)}

  {@const previousMatches = surveyRecord.matches
    .filter((match) => entryRecords.some((e) => e.status != "draft" && e.type == "match" && e.match == match.number))
    .toSorted((a, b) => b.number - a.number)
    .slice(0, 3)}

  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Analysis</h2>

    {#each surveyRecord.pickLists as pickList, index}
      <Button
        onclick={() =>
          openDialog(ViewPickListDialog, {
            surveyRecord,
            entriesByTeam,
            pickList,
            index,
          })}
      >
        {pickList.name}
      </Button>
    {/each}

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
  </div>

  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Matches</h2>

    {#if upcomingMatches.length || previousMatches.length}
      <div class="flex flex-wrap gap-2">
        {#snippet teamRow(match: Match)}
          {@const onclick = () => {
            openDialog(ViewMatchDialog, { surveyRecord, entryRecords: entryRecords as IDBRecord<MatchEntry>[], match });
          }}

          <tr
            tabindex="0"
            role="button"
            {onclick}
            onkeydown={(e) => {
              if (e.key == " " || e.key == "Enter") {
                e.preventDefault();
                onclick();
              }
            }}
            class="button cursor-pointer bg-neutral-800"
          >
            <td class="w-0 p-2">{match.number}</td>
            <td class="w-0 space-y-0.5 p-2">
              <div class="text-red">{match.red1}</div>
              <div class="text-blue">{match.blue1}</div>
            </td>
            <td class="w-0 space-y-0.5 p-2">
              <div class="text-red">{match.red2}</div>
              <div class="text-blue">{match.blue2}</div>
            </td>
            <td class="w-0 space-y-0.5 p-2">
              <div class="text-red">{match.red3}</div>
              <div class="text-blue">{match.blue3}</div>
            </td>
            <td></td>
          </tr>
        {/snippet}

        {#if upcomingMatches.length}
          <div class="flex grow flex-col">
            <small>Upcoming</small>
            <table class="border-separate border-spacing-y-2 text-center">
              <tbody>
                {#each upcomingMatches as match}
                  {@render teamRow(match)}
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        {#if previousMatches.length}
          <div class="flex grow flex-col">
            <small>Previous</small>
            <table class="border-separate border-spacing-y-2 text-center">
              <tbody>
                {#each previousMatches as match}
                  {@render teamRow(match)}
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}

    <Anchor route="survey/{surveyRecord.id}/matches">
      <Icon name="table-list" />
      <div class="flex grow flex-col">
        Matches
        <small>
          {matchesScouted} scouted,
          {surveyRecord.matches.length} total
        </small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>
  </div>
{/if}

<div class="flex flex-col gap-2 p-3">
  <h2 class="font-bold">Teams</h2>

  <Anchor route="survey/{surveyRecord.id}/teams">
    <Icon name="people-group" />
    <div class="flex grow flex-col">
      Teams
      <small>
        {#if surveyRecord.type == "match"}
          {new Set(
            surveyRecord.matches.flatMap((match) => [
              match.red1,
              match.red2,
              match.red3,
              match.blue1,
              match.blue2,
              match.blue3,
            ]),
          ).size} from matches,
        {/if}
        {surveyRecord.teams.length} custom
      </small>
    </div>
    <Icon name="arrow-right" />
  </Anchor>
</div>

{#if $modeStore == "admin"}
  {@const shouldHideConfigureText =
    entryRecords.length > 0 ||
    (surveyRecord.type == "match" && (surveyRecord.expressions.length > 0 || surveyRecord.pickLists.length > 0))}

  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">Admin</h2>

    <Button onclick={() => openDialog(ExportSurveyDialog, { surveyRecord })}>
      <Icon name="share-from-square" />
      <div class="flex flex-col">
        Export
        <small>QR code, file</small>
      </div>
    </Button>

    <Anchor route="survey/{surveyRecord.id}/fields">
      <Icon name="list-check" />
      <div class="flex grow flex-col">
        Fields
        <small>
          {#if !shouldHideConfigureText}
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
  </div>
{/if}
