<script lang="ts">
  import { getMatchTeamFontWeight, sessionStorageStore, type Match } from "$lib";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import ExportSurveyDialog from "$lib/dialogs/ExportSurveyDialog.svelte";
  import NewEntryDialog from "$lib/dialogs/NewEntryDialog.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import ViewAnalysisDialog from "$lib/dialogs/ViewAnalysisDialog.svelte";
  import { getMatchEntriesByTeam, type MatchEntry } from "$lib/entry";
  import { objectStore } from "$lib/idb";
  import { cameraStore, targetStore, teamStore } from "$lib/settings";
  import { getLastCompletedMatch, type MatchSurvey } from "$lib/survey";
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    DicesIcon,
    InfoIcon,
    PlusIcon,
    ReplaceIcon,
    Settings2Icon,
    SettingsIcon,
    ShareIcon,
    UsersIcon,
  } from "@lucide/svelte";
  import type { PageData } from "./$types";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import { getPredictionsPerScout } from "$lib/prediction";
  import OverwriteSurveyDialog from "$lib/dialogs/OverwriteSurveyDialog.svelte";
  import SurveyPageHeader from "./SurveyPageHeader.svelte";
  import { type PickList } from "$lib/analysis";
  import { sortExpressions, type Expression } from "$lib/expression";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const filterMatches = sessionStorageStore<"true" | "">("filter-matches", "");

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

  let prefilledScout = $derived.by(() => {
    const latestEntries = data.entryRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime());

    if (data.surveyType == "match") {
      for (const entry of latestEntries) {
        if (
          entry.scout &&
          entry.type == "match" &&
          data.surveyRecord.matches.some(
            (m) => m.number == entry.match && m[$targetStore.replace(" ", "") as keyof Match] == entry.team,
          )
        ) {
          return entry.scout;
        }
      }
    }

    if (latestEntries[0] && latestEntries[0].scout) {
      return latestEntries[0].scout;
    }
  });

  let drafts = $derived(
    data.entryRecords
      .filter((e) => e.status == "draft")
      .toSorted((a, b) => b.modified.getTime() - a.modified.getTime()),
  );

  let entries = $derived.by(() => {
    if (data.surveyType == "pit") {
      return data.entryRecords
        .filter((e) => e.status != "draft")
        .toSorted((a, b) => b.modified.getTime() - a.modified.getTime())
        .slice(0, 2);
    }

    return data.entryRecords
      .filter((e) => {
        if (e.status == "draft") return false;
        return data.surveyRecord.matches.some((m) => {
          if (m.number != e.match) return false;
          switch ($targetStore) {
            case "red 1":
              return m.red1 == e.team;
            case "red 2":
              return m.red2 == e.team;
            case "red 3":
              return m.red3 == e.team;
            case "blue 1":
              return m.blue1 == e.team;
            case "blue 2":
              return m.blue2 == e.team;
            case "blue 3":
              return m.blue3 == e.team;
          }
          return false;
        });
      })
      .toSorted((a, b) => b.match - a.match)
      .slice(0, 2);
  });

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

  function matchHasTeamStore(match: Match) {
    return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].includes($teamStore);
  }

  function refresh() {
    const entriesRequest = objectStore("entries").index("surveyId").getAll(data.surveyRecord.id);

    entriesRequest.onerror = () => {
      location.reload();
    };

    entriesRequest.onsuccess = () => {
      if (!entriesRequest.result) {
        location.reload();
        return;
      }

      data = {
        ...data,
        entryRecords: entriesRequest.result,
      };
    };
  }
</script>

<SurveyPageHeader surveyRecord={data.surveyRecord} page="overview" />

<div class="flex flex-col gap-6" style="view-transition-name:survey-{data.surveyRecord.id}">
  {@render entriesWidget()}

  {#if data.surveyType == "match" && (data.surveyRecord.pickLists.length || data.surveyRecord.expressions.length)}
    {@render analysisWidget(data.surveyRecord.pickLists, data.surveyRecord.expressions, data.entryRecords)}
  {/if}

  {#if data.surveyRecord.matches.length}
    {@render matchesWidget()}
  {/if}

  {#if teamCount}
    {@render teamsWidget()}
  {/if}

  {#if data.surveyType == "match" && data.surveyRecord.scouts}
    {@render predictionsWidget(data.surveyRecord, data.entryRecords)}
  {/if}

  {@render surveyWidget()}
  {@render appWidget()}
</div>

{#snippet entriesWidget()}
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap justify-between gap-2">
      <div class="flex flex-col">
        <h2 class="font-bold">Entries</h2>
        <span class="text-xs font-light">
          {data.entryRecords.length - drafts.length} completed
          {#if data.surveyRecord.matches.length}
            of {data.surveyRecord.matches.length * 6}
          {/if}
        </span>
      </div>
      <Anchor route="survey/{data.surveyRecord.id}/entries">
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    </div>

    <Button
      onclick={() => {
        openDialog(NewEntryDialog, {
          pageData: data,
          prefilledMatch,
          prefilledTeam,
          prefilledScout,
          onnewscout(newScout) {
            data = {
              ...data,
              surveyRecord: { ...data.surveyRecord, scouts: [...(data.surveyRecord.scouts || []), newScout] },
            } as PageData;
            objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
          },
        });
      }}
      class="flex-col items-start"
    >
      <div class="flex gap-2">
        <PlusIcon class="text-theme shrink-0" />
        <span>New entry</span>
      </div>
      {@render entryOverview(data.surveyType == "match" ? prefilledMatch : undefined, prefilledTeam, prefilledTeamName)}
    </Button>

    {#if drafts.length}
      <div class="flex flex-col">
        <span class="text-xs">{drafts.length} {drafts.length == 1 ? "draft" : "drafts"}</span>

        <div class="flex flex-col gap-2">
          {#each drafts as draft (draft.id)}
            <Anchor route="entry/{draft.id}" style="view-transition-name:draft-{draft.id}">
              <div class="grow">
                {@render entryOverview(
                  draft.type == "match" ? draft.match : undefined,
                  draft.team,
                  data.surveyRecord.teams.find((t) => t.number == draft.team)?.name,
                )}
              </div>
              <ArrowRightIcon class="text-theme" />
            </Anchor>
          {/each}
        </div>
      </div>
    {/if}

    {#if entries.length}
      <div class="flex flex-col" style="view-transition-name:entries">
        <span class="text-xs">Recent for <span class="text-theme font-bold capitalize">{$targetStore}</span></span>

        <div class="flex flex-col gap-2">
          {#each entries as entry (entry.id)}
            <Button
              onclick={() => {
                openDialog(ViewEntryDialog, {
                  surveyRecord: data.surveyRecord,
                  fieldRecords: data.fieldRecords,
                  entryRecord: entry,
                  onchange: refresh,
                });
              }}
            >
              {@render entryOverview(
                entry.type == "match" ? entry.match : undefined,
                entry.team,
                data.surveyRecord.teams.find((t) => t.number == entry.team)?.name,
              )}
            </Button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet analysisWidget(pickLists: PickList[], expressions: Expression[], entryRecords: IDBRecord<MatchEntry>[])}
  {@const entriesByTeam = getMatchEntriesByTeam(entryRecords)}
  {@const displayedExpressions = expressions.toSorted(sortExpressions).slice(0, 3 - pickLists.length)}

  <div class="flex flex-col gap-3" style="view-transition-name:analysis">
    <div class="flex flex-wrap justify-between gap-2">
      <div class="flex flex-col">
        <h2 class="font-bold">Analysis</h2>
        <span class="text-xs font-light">
          {#if pickLists.length}
            {pickLists.length} {pickLists.length == 1 ? "pick list" : "pick lists"}
          {/if}
          {#if expressions.length}
            {expressions.length} {expressions.length == 1 ? "expression" : "expressions"}
          {/if}
        </span>
      </div>
      <Anchor route="survey/{data.surveyRecord.id}/analysis">
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    </div>

    <div class="flex flex-col gap-2">
      {#each pickLists as pickList}
        <Button
          onclick={() => {
            openDialog(ViewAnalysisDialog, {
              pageData: data as Extract<PageData, { surveyType: "match" }>,
              entriesByTeam,
              analysis: { type: "picklist", pickList },
            });
          }}
        >
          {pickList.name}
        </Button>
      {/each}

      {#each displayedExpressions as expression}
        <Button
          onclick={() => {
            openDialog(ViewAnalysisDialog, {
              pageData: data as Extract<PageData, { surveyType: "match" }>,
              entriesByTeam,
              analysis: { type: "expression", expression },
            });
          }}
        >
          {expression.name}
        </Button>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet matchesWidget()}
  {@const matches = $filterMatches ? data.surveyRecord.matches.filter(matchHasTeamStore) : data.surveyRecord.matches}
  {@const lastCompletedMatch = getLastCompletedMatch(data.surveyRecord, data.entryRecords)}

  {@const upcomingMatches = matches
    .filter((match) => match.number > lastCompletedMatch)
    .toSorted((a, b) => a.number - b.number)
    .slice(0, 3)}

  {@const previousMatches = matches
    .filter((match) => match.number <= lastCompletedMatch)
    .toSorted((a, b) => b.number - a.number)
    .slice(0, 3)}

  <div class="flex flex-col gap-3" style="view-transition-name:matches">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div class="flex flex-col">
        <h2 class="font-bold">Matches</h2>
        <span class="text-xs font-light">
          {#if data.surveyType == "match"}
            {@const matchesScouted = data.surveyRecord.matches.filter((match) => {
              const teams = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
              return data.entryRecords.find(
                (e) => e.type == "match" && e.status != "draft" && teams.includes(e.team) && e.match == match.number,
              );
            }).length}

            {matchesScouted} scouted of {data.surveyRecord.matches.length}
          {:else}
            {data.surveyRecord.matches.length} total
          {/if}
        </span>
      </div>

      <div class="flex gap-2 text-sm">
        {#if $teamStore}
          <Button
            onclick={() => ($filterMatches = "")}
            class={$filterMatches ? "font-light" : "font-bold"}
            style="view-transition-name:match-filter-all"
          >
            All
          </Button>
          <Button
            onclick={() => ($filterMatches = "true")}
            class={$filterMatches ? "font-bold" : "font-light"}
            style="view-transition-name:match-filter-team"
          >
            {$teamStore}
          </Button>
        {/if}

        <Anchor route="survey/{data.surveyRecord.id}/matches">
          <ArrowRightIcon class="text-theme" />
        </Anchor>
      </div>
    </div>

    {#if matches.length}
      <div class="grid grid-cols-[repeat(4,min-content)_auto] gap-x-2 gap-y-3">
        {#if upcomingMatches.length}
          <div class="col-span-full grid grid-cols-subgrid">
            <span class="col-span-full text-xs">Upcoming</span>
            <div class="col-span-full grid grid-cols-subgrid gap-2">
              {#each upcomingMatches as match}
                {@render teamRow(match)}
              {/each}
            </div>
          </div>
        {/if}

        {#if previousMatches.length}
          <div class="col-span-full grid grid-cols-subgrid">
            <span class="col-span-full text-xs">Previous</span>
            <div class="col-span-full grid grid-cols-subgrid gap-2">
              {#each previousMatches as match}
                {@render teamRow(match)}
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet teamsWidget()}
  <Anchor route="survey/{data.surveyRecord.id}/teams" style="view-transition-name:teams">
    <UsersIcon class="text-theme" />
    <div class="flex grow flex-col">
      Teams
      <small>{teamCount} total</small>
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
{/snippet}

{#snippet predictionsWidget(surveyRecord: IDBRecord<MatchSurvey>, entryRecords: IDBRecord<MatchEntry>[])}
  {@const { overallAccuracy } = getPredictionsPerScout(surveyRecord, entryRecords)}

  <Anchor route="survey/{data.surveyRecord.id}/predictions" style="view-transition-name:predictions">
    <DicesIcon class="text-theme" />
    <div class="flex grow flex-col">
      Predictions
      {#if overallAccuracy}
        <small>{(overallAccuracy * 100).toFixed(1)}% accuracy</small>
      {/if}
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
{/snippet}

{#snippet surveyWidget()}
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Survey</h2>
    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => {
          openDialog(ExportSurveyDialog, {
            surveyRecord: data.surveyRecord,
            fieldRecords: data.fieldRecords,
          });
        }}
        class="grow basis-0"
      >
        <ShareIcon class="text-theme" />
        <div class="flex flex-col">
          Export
          <small>QRF code, File</small>
        </div>
      </Button>
      <Button
        onclick={() => {
          openDialog(OverwriteSurveyDialog, {
            surveyRecord: data.surveyRecord,
            fieldRecords: data.fieldRecords,
            entryCount: data.entryRecords.length,
          });
        }}
        class="grow basis-0"
      >
        <ReplaceIcon class="text-theme" />
        <div class="flex flex-col">
          Overwrite
          <small>
            {#if $cameraStore}
              QRF code, File
            {:else}
              File
            {/if}
          </small>
        </div>
      </Button>
    </div>
    <Anchor route="survey/{data.surveyRecord.id}/admin" style="view-transition-name:admin">
      <Settings2Icon class="text-theme" />
      <div class="flex grow flex-col">
        Admin
        <small>Setup, Configure</small>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
  </div>
{/snippet}

{#snippet appWidget()}
  <div class="flex flex-col gap-2" style="view-transition-name:meanscout">
    <h2 class="font-bold">MeanScout</h2>
    <Anchor route="" class="active:-left-0.5!">
      <ArrowLeftIcon class="text-theme" />
      <div class="flex grow flex-col">
        Main page
        <small>Switch survey</small>
      </div>
    </Anchor>
    <Anchor route="settings" style="view-transition-name:settings">
      <SettingsIcon class="text-theme" />
      <div class="flex grow flex-col">
        Settings
        <small>App config</small>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
    <Anchor route="about" style="view-transition-name:about">
      <InfoIcon class="text-theme" />
      <div class="flex grow flex-col">
        About
        <small>Info, Guides</small>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
  </div>
{/snippet}

{#snippet entryOverview(match: number | undefined, team: string | undefined, teamName: string | undefined)}
  <div class="flex items-center gap-x-4 gap-y-2">
    {#if match !== undefined}
      <div class="flex flex-col">
        <small class="font-light">Match</small>
        <span>{match}</span>
      </div>
    {/if}
    {#if team}
      <div class="flex flex-col">
        <small class="font-light text-wrap">{teamName || "Team"}</small>
        <span>{team}</span>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet teamRow(match: Match)}
  <Button
    onclick={() => openDialog(ViewMatchDialog, { pageData: data, match })}
    class="col-span-full grid grid-cols-subgrid gap-x-3 text-center!"
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
