<script lang="ts">
  import { getMatchTeamFontWeight, type Match } from "$lib";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import ExportSurveyDialog from "$lib/dialogs/ExportSurveyDialog.svelte";
  import NewEntryDialog from "$lib/dialogs/NewEntryDialog.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import ViewPickListDialog from "$lib/dialogs/ViewPickListDialog.svelte";
  import { getMatchEntriesByTeam } from "$lib/entry";
  import { objectStore } from "$lib/idb";
  import { modeStore, targetStore, teamStore } from "$lib/settings";
  import { getLastCompletedMatch, type MatchSurvey } from "$lib/survey";
  import type { PageData } from "./$types";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let prefilledMatch = $derived.by(() => {
    const recordedMatches = data.entryRecords.filter((entry) => entry.type == "match").map((entry) => entry.match);
    return 1 + Math.max(...recordedMatches, 0);
  });

  let prefilledTeam = $derived.by(() => {
    if (data.surveyType != "match") return "";

    const matchData = data.surveyRecord.matches.find((match) => match.number == prefilledMatch);
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
  });

  let prefilledTeamName = $derived(data.surveyRecord.teams.find((t) => t.number == prefilledTeam)?.name);

  let drafts = $derived(
    data.entryRecords
      .filter((e) => e.status == "draft")
      .toSorted((a, b) => b.modified.getTime() - a.modified.getTime()),
  );

  let filterMatches = $state(false);

  const teamCount =
    data.surveyType == "pit"
      ? data.surveyRecord.teams.length
      : new Set([
          ...data.surveyRecord.matches.flatMap((match) => [
            match.red1,
            match.red2,
            match.red3,
            match.blue1,
            match.blue2,
            match.blue3,
          ]),
          ...data.surveyRecord.teams.map((team) => team.number),
        ]).size;

  function getPrefilledTeam(matchValue: number) {}

  function matchHasTeamStore(match: Match) {
    return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].includes($teamStore);
  }
</script>

<Header title="{data.surveyRecord.name} - MeanScout" heading={data.surveyRecord.name} />

<div class="flex flex-col gap-6" style="view-transition-name:survey-{data.surveyRecord.id}">
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Entries</h2>

    <Button
      onclick={() => {
        openDialog(NewEntryDialog, {
          data,
          prefilledTeam,
          prefilledMatch,
          oncreate(entry) {
            data = {
              ...data,
              surveyRecord: { ...data.surveyRecord, modified: new Date() },
              entryRecords: [...data.entryRecords, entry],
            } as PageData;

            objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
          },
        });
      }}
    >
      <Icon name="plus" />
      <div class="flex flex-col">
        {#if data.surveyType == "match" && prefilledMatch}
          <span><small>Match</small> {prefilledMatch}</span>
        {/if}
        {#if prefilledTeam}
          <span><small>Team</small> {prefilledTeam}</span>
          {#if prefilledTeamName}
            <span><small class="font-light">{prefilledTeamName}</small></span>
          {/if}
        {/if}
        {#if data.surveyType == "pit" || (!prefilledMatch && !prefilledTeam)}
          <span>New entry</span>
        {/if}
      </div>
    </Button>

    {#each drafts as draft (draft.id)}
      {@const teamName = data.surveyRecord.teams.find((t) => t.number == draft.team)?.name}

      <Anchor route="entry/{draft.id}" style="view-transition-name:draft-{draft.id}">
        <div class="flex grow flex-col">
          {#if draft.type == "match"}
            <span><small>Match</small> {draft.match}</span>
          {/if}
          <span><small>Team</small> {draft.team}</span>
          {#if teamName?.length}
            <span><small class="font-light">{teamName}</small></span>
          {/if}
        </div>
        <Icon name="arrow-right" />
      </Anchor>
    {/each}

    <Anchor route="survey/{data.surveyRecord.id}/entries" style="view-transition-name:entries">
      <Icon name="list-ol" />
      <div class="flex grow flex-col">
        Entries
        <small>{data.entryRecords.length - drafts.length} completed</small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>
  </div>

  {#if data.surveyType == "match" && (data.surveyRecord.pickLists.length || data.surveyRecord.expressions.length)}
    {@const entriesByTeam = getMatchEntriesByTeam(data.entryRecords)}

    <div class="flex flex-col gap-2" style="view-transition-name:analysis">
      <h2 class="font-bold">Analysis</h2>

      {#each data.surveyRecord.pickLists as pickList}
        <Button
          onclick={() =>
            openDialog(ViewPickListDialog, {
              surveyRecord: data.surveyRecord as IDBRecord<MatchSurvey>,
              fields: data.fields,
              entriesByTeam,
              pickList,
            })}
        >
          {pickList.name}
        </Button>
      {/each}

      <Anchor route="survey/{data.surveyRecord.id}/analysis">
        <Icon name="chart-simple" />
        <div class="flex grow flex-col">
          Analysis
          <small>Pick Lists, Expressions</small>
        </div>
        <Icon name="arrow-right" />
      </Anchor>
    </div>
  {/if}

  {#if data.surveyRecord.matches.length}
    {@const matches = filterMatches ? data.surveyRecord.matches.filter(matchHasTeamStore) : data.surveyRecord.matches}

    {@const lastCompletedMatch = getLastCompletedMatch(data.surveyRecord, data.entryRecords)}

    {@const upcomingMatches = matches
      .filter((match) => match.number > lastCompletedMatch)
      .toSorted((a, b) => a.number - b.number)
      .slice(0, 3)}

    {@const previousMatches = matches
      .filter((match) => match.number <= lastCompletedMatch)
      .toSorted((a, b) => b.number - a.number)
      .slice(0, 3)}

    <div class="flex flex-col gap-2" style="view-transition-name:matches">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-bold">Matches</h2>
        {#if $teamStore}
          <div class="flex gap-2 text-sm">
            <Button
              onclick={() => (filterMatches = false)}
              class={filterMatches ? "font-light" : "font-bold"}
              style="view-transition-name:match-filter-all"
            >
              All
            </Button>
            <Button
              onclick={() => (filterMatches = true)}
              class={filterMatches ? "font-bold" : "font-light"}
              style="view-transition-name:match-filter-team"
            >
              {$teamStore}
            </Button>
          </div>
        {/if}
      </div>

      {#if matches.length}
        <div class="flex flex-wrap gap-2">
          {#snippet teamRow(match: Match)}
            <Button
              onclick={() => {
                openDialog(ViewMatchDialog, {
                  data,
                  match,
                });
              }}
              class="col-span-full grid grid-cols-subgrid gap-x-3 text-center"
            >
              <div>{match.number}</div>
              <div class="col-span-3 grid grid-cols-subgrid gap-x-3">
                <div class="text-red {getMatchTeamFontWeight(match.red1)}">{match.red1}</div>
                <div class="text-red {getMatchTeamFontWeight(match.red2)}">{match.red2}</div>
                <div class="text-red {getMatchTeamFontWeight(match.red3)}">{match.red3}</div>
                <div class="text-blue {getMatchTeamFontWeight(match.blue1)}">{match.blue1}</div>
                <div class="text-blue {getMatchTeamFontWeight(match.blue2)}">{match.blue2}</div>
                <div class="text-blue {getMatchTeamFontWeight(match.blue3)}">{match.blue3}</div>
              </div>
            </Button>
          {/snippet}

          {#if upcomingMatches.length}
            <div class="flex grow flex-col">
              <small>Upcoming</small>
              <div class="grid grid-cols-[repeat(4,_min-content)_auto] gap-2">
                {#each upcomingMatches as match}
                  {@render teamRow(match)}
                {/each}
              </div>
            </div>
          {/if}

          {#if previousMatches.length}
            <div class="flex grow flex-col">
              <small>Previous</small>
              <div class="grid grid-cols-[repeat(4,_min-content)_auto] gap-2">
                {#each previousMatches as match}
                  {@render teamRow(match)}
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <Anchor route="survey/{data.surveyRecord.id}/matches">
        <Icon name="table-list" />
        <div class="flex grow flex-col">
          Matches
          <small>
            {#if data.surveyType == "match"}
              {@const matchesScouted = data.surveyRecord.matches.filter((match) => {
                const teams = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
                return data.entryRecords.find(
                  (e) => e.type == "match" && e.status != "draft" && teams.includes(e.team) && e.match == match.number,
                );
              }).length}

              {matchesScouted} scouted,
            {/if}

            {data.surveyRecord.matches.length} total
          </small>
        </div>
        <Icon name="arrow-right" />
      </Anchor>
    </div>
  {/if}

  {#if teamCount}
    <div class="flex flex-col gap-2" style="view-transition-name:teams">
      <h2 class="font-bold">Teams</h2>

      <Anchor route="survey/{data.surveyRecord.id}/teams">
        <Icon name="people-group" />
        <div class="flex grow flex-col">
          Teams
          <small>{teamCount} total</small>
        </div>
        <Icon name="arrow-right" />
      </Anchor>
    </div>
  {/if}

  {#if $modeStore == "admin"}
    {#if data.surveyType == "match" && data.surveyRecord.scouts}
      <div class="flex flex-col gap-2" style="view-transition-name:predictions">
        <h2 class="font-bold">Predictions</h2>

        <Anchor route="survey/{data.surveyRecord.id}/predictions">
          <Icon name="dice" />
          <div class="flex grow flex-col">Predictions</div>
          <Icon name="arrow-right" />
        </Anchor>
      </div>
    {/if}

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Survey</h2>

      <div class="flex flex-wrap gap-2">
        <Button
          onclick={() =>
            openDialog(ExportSurveyDialog, {
              surveyRecord: data.surveyRecord,
              fieldRecords: data.fieldRecords,
              type: "qrcode",
            })}
          class="grow basis-0"
        >
          <Icon name="qrcode" />
          <div class="flex flex-col">
            Export
            <small>QRF code</small>
          </div>
        </Button>
        <Button
          onclick={() =>
            openDialog(ExportSurveyDialog, {
              surveyRecord: data.surveyRecord,
              fieldRecords: data.fieldRecords,
              type: "file",
            })}
          class="grow basis-0"
        >
          <Icon name="copy" />
          <div class="flex flex-col">
            Export
            <small>File</small>
          </div>
        </Button>
      </div>

      <Anchor route="survey/{data.surveyRecord.id}/admin" style="view-transition-name:admin">
        <Icon name="toolbox" />
        <div class="flex grow flex-col">
          Admin
          <small>Setup, Configure</small>
        </div>
        <Icon name="arrow-right" />
      </Anchor>
    </div>
  {/if}

  <div class="flex flex-col gap-2" style="view-transition-name:meanscout">
    <h2 class="font-bold">MeanScout</h2>
    <Anchor route="">
      <Icon name="arrow-left" />
      <div class="flex grow flex-col">
        Main page
        <small>Switch survey</small>
      </div>
    </Anchor>
    <Anchor route="settings" style="view-transition-name:settings">
      <Icon name="gears" />
      <div class="flex grow flex-col">
        Settings
        <small>App config</small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>
    <Anchor route="about" style="view-transition-name:about">
      <Icon name="info-circle" />
      <div class="flex grow flex-col">
        About
        <small>Info, Guides</small>
      </div>
      <Icon name="arrow-right" />
    </Anchor>
  </div>
</div>
