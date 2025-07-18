<script lang="ts">
  import { getMatchTeamFontWeight, sessionStorageStore, type Match } from "$lib";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import NewEntryDialog from "$lib/dialogs/NewEntryDialog.svelte";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import { type MatchEntry } from "$lib/entry";
  import { idb } from "$lib/idb";
  import { cameraStore, targetStore, teamStore } from "$lib/settings";
  import { getLastCompletedMatch } from "$lib/survey";
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChartBarBigIcon,
    DicesIcon,
    InfoIcon,
    ListOrderedIcon,
    NotepadTextIcon,
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
  import { goto } from "$app/navigation";
  import BulkExportDialog from "$lib/dialogs/BulkExportDialog.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const filterMatches = sessionStorageStore<"true" | "">("filter-matches", "");

  const prefilledMatch = $derived.by(() => {
    if (data.surveyType == "pit") return 0;
    const recordedMatches = data.entryRecords.filter((entry) => entry.type == "match").map((entry) => entry.match);
    return 1 + Math.max(...recordedMatches, 0);
  });

  const prefilledTeam = $derived.by(() => {
    if (data.surveyType == "pit") {
      if (!data.compRecord.teams.length) return "";

      const scoutedTeams = data.entryRecords.map((e) => e.team).toSorted((a, b) => Number(a) - Number(b));
      const unscoutedTeams = data.compRecord.teams
        .filter((t) => !scoutedTeams.includes(t.number))
        .toSorted((a, b) => Number(a.number) - Number(b.number));

      return unscoutedTeams[0]?.number || scoutedTeams?.[0] || "";
    }

    const matchData = data.compRecord.matches.find((match) => match.number == prefilledMatch);
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

  const prefilledTeamName = $derived(data.compRecord.teams.find((t) => t.number == prefilledTeam)?.name);

  const prefilledScout = $derived.by(() => {
    const latestEntries = data.entryRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime());

    if (data.surveyType == "match") {
      for (const entry of latestEntries) {
        if (
          entry.scout &&
          entry.type == "match" &&
          data.compRecord.matches.some(
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

  const drafts = $derived(
    data.entryRecords
      .filter((e) => e.status == "draft")
      .toSorted((a, b) => b.modified.getTime() - a.modified.getTime()),
  );

  const entries = $derived.by(() => {
    if (data.surveyType == "pit") {
      return data.entryRecords
        .filter((e) => e.status != "draft")
        .toSorted((a, b) => b.modified.getTime() - a.modified.getTime())
        .slice(0, 2);
    }

    return data.entryRecords
      .filter((e) => {
        if (e.status == "draft") return false;
        return data.compRecord.matches.some((m) => {
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

  const teamCount = $derived(
    data.surveyType == "pit"
      ? data.compRecord.teams.length
      : new Set([
          ...data.compRecord.matches.flatMap((match) => [
            match.red1,
            match.red2,
            match.red3,
            match.blue1,
            match.blue2,
            match.blue3,
          ]),
          ...data.compRecord.teams.map((team) => team.number),
        ]).size,
  );

  const matches = $derived(
    $filterMatches ? data.compRecord.matches.filter(matchHasTeamStore) : data.compRecord.matches,
  );
  const lastCompletedMatch = $derived(getLastCompletedMatch(data.compRecord, data.surveyRecord, data.entryRecords));

  const upcomingMatches = $derived(
    matches
      .filter((match) => match.number > lastCompletedMatch)
      .toSorted((a, b) => a.number - b.number)
      .slice(0, 3),
  );

  const previousMatches = $derived(
    matches
      .filter((match) => match.number <= lastCompletedMatch)
      .toSorted((a, b) => b.number - a.number)
      .slice(0, 3),
  );

  const matchesScouted = $derived(
    data.compRecord.matches.filter((match) => {
      const teams = [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3];
      return data.entryRecords.find(
        (e) => e.type == "match" && e.status != "draft" && teams.includes(e.team) && e.match == match.number,
      );
    }).length,
  );

  function matchHasTeamStore(match: Match) {
    return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].includes($teamStore);
  }

  function refresh() {
    const entriesRequest = idb.objectStore("entries").index("surveyId").getAll(data.surveyRecord.id);

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

<SurveyPageHeader compRecord={data.compRecord} surveyRecord={data.surveyRecord} page="overview" />

<div class="flex flex-col gap-6" style="view-transition-name:survey-{data.surveyRecord.id}">
  {@render entriesWidget()}

  {#if data.surveyType == "match" && (data.surveyRecord.pickLists.length || data.surveyRecord.expressions.length)}
    {@render analysisWidget(data.surveyRecord.pickLists, data.surveyRecord.expressions)}
  {/if}

  {#if data.compRecord.matches.length}
    {@render matchesWidget()}
  {/if}

  {#if teamCount}
    {@render teamsWidget()}
  {/if}

  {#if data.surveyType == "match" && data.compRecord.scouts}
    {@render predictionsWidget(data.entryRecords)}
  {/if}

  {@render surveyWidget()}
  {@render compWidget()}
  {@render appWidget()}
</div>

{#snippet entriesWidget()}
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <NotepadTextIcon class="text-theme" />
      <div class="flex grow flex-col">
        <h2 class="font-bold">Entries</h2>
        <span class="text-xs font-light">
          {data.entryRecords.length - drafts.length} completed
          {#if data.surveyType == "match" && data.compRecord.matches.length}
            of {data.compRecord.matches.length * 6}
          {:else if data.compRecord.teams.length}
            of {data.compRecord.teams.length}
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
              compRecord: { ...data.compRecord, scouts: [...(data.compRecord.scouts || []), newScout] },
            } as PageData;
            idb.objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
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
                  data.compRecord.teams.find((t) => t.number == draft.team)?.name,
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
                  compRecord: data.compRecord,
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
                data.compRecord.teams.find((t) => t.number == entry.team)?.name,
              )}
            </Button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet analysisWidget(pickLists: PickList[], expressions: Expression[])}
  {@const displayedExpressions = expressions.toSorted(sortExpressions).slice(0, 4 - pickLists.length)}

  <div class="flex flex-col gap-3" style="view-transition-name:analysis">
    <div class="flex flex-wrap items-center gap-2">
      <ChartBarBigIcon class="text-theme" />
      <div class="flex grow flex-col">
        <h2 class="font-bold">Analysis</h2>
        <span class="text-xs font-light">
          {#if pickLists.length}
            {pickLists.length} {pickLists.length == 1 ? "pick list" : "pick lists"}{expressions.length ? "," : ""}
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
            sessionStorage.setItem("analysis-view", `picklist-${pickList.name}`);
            goto(`#/survey/${data.surveyRecord.id}/analysis`);
          }}
          class="justify-between"
        >
          {pickList.name}
          <ArrowRightIcon class="text-theme" />
        </Button>
      {/each}

      {#each displayedExpressions as expression}
        <Button
          onclick={() => {
            sessionStorage.setItem("analysis-view", `expression-${expression.name}`);
            goto(`#/survey/${data.surveyRecord.id}/analysis`);
          }}
          class="justify-between"
        >
          {expression.name}
          <ArrowRightIcon class="text-theme" />
        </Button>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet matchesWidget()}
  <div class="flex flex-col gap-3" style="view-transition-name:matches">
    <div class="flex flex-wrap items-center gap-2">
      <ListOrderedIcon class="text-theme" />
      <div class="flex grow flex-col">
        <h2 class="font-bold">Matches</h2>
        <span class="text-xs font-light">
          {#if data.surveyType == "match"}
            {matchesScouted} scouted of {data.compRecord.matches.length}
          {:else}
            {data.compRecord.matches.length} total
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

    <div class="flex flex-wrap gap-2">
      <div class="flex grow basis-60 flex-col">
        <span class="text-xs">Upcoming</span>
        <div class="flex flex-col gap-2">
          {#each upcomingMatches as match}
            {@render teamRow(match)}
          {:else}
            <span class="text-sm">No upcoming matches.</span>
          {/each}
        </div>
      </div>

      <div class="flex grow basis-60 flex-col">
        <span class="col-span-full text-xs">Previous</span>
        <div class="flex flex-col gap-2">
          {#each previousMatches as match}
            {@render teamRow(match)}
          {:else}
            <span class="text-sm">No previous matches.</span>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/snippet}

{#snippet teamsWidget()}
  <Anchor route="survey/{data.surveyRecord.id}/teams" style="view-transition-name:teams">
    <UsersIcon class="text-theme" />
    <div class="flex grow flex-col">
      <span class="font-bold">Teams</span>
      <span class="text-xs font-light">{teamCount} total</span>
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
{/snippet}

{#snippet predictionsWidget(entryRecords: IDBRecord<MatchEntry>[])}
  {@const { overallAccuracy } = getPredictionsPerScout(data.compRecord, entryRecords)}

  <Anchor route="survey/{data.surveyRecord.id}/predictions" style="view-transition-name:predictions">
    <DicesIcon class="text-theme" />
    <div class="flex grow flex-col">
      <span class="font-bold">Predictions</span>
      {#if overallAccuracy}
        <span class="text-xs font-light">{(overallAccuracy * 100).toFixed(1)}% accuracy</span>
      {/if}
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
{/snippet}

{#snippet surveyWidget()}
  <div class="flex flex-col gap-2" style="view-transition-name:survey">
    <h2 class="font-bold">{data.surveyRecord.name}</h2>

    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => {
          openDialog(BulkExportDialog, {
            surveys: [data.surveyRecord],
            fields: data.fieldRecords,
            entries: data.entryRecords,
          });
        }}
        class="grow basis-0"
      >
        <ShareIcon class="text-theme" />
        <div class="flex flex-col">
          Export
          <span class="text-xs font-light">QRF code, File</span>
        </div>
      </Button>
      <Button
        onclick={() => {
          openDialog(OverwriteSurveyDialog, {
            compId: data.compRecord.id,
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
          <span class="text-xs font-light">
            {#if $cameraStore}
              QRF code, File
            {:else}
              File
            {/if}
          </span>
        </div>
      </Button>
    </div>
    <Anchor route="survey/{data.surveyRecord.id}/admin" style="view-transition-name:admin">
      <Settings2Icon class="text-theme" />
      <div class="flex grow flex-col">
        Admin
        <span class="text-xs font-light">Setup, Configure</span>
      </div>
      <ArrowRightIcon class="text-theme" />
    </Anchor>
  </div>
{/snippet}

{#snippet compWidget()}
  <div class="flex flex-col gap-2" style="view-transition-name:comp">
    <h2 class="font-bold">{data.compRecord.name}</h2>
    <Anchor route="comp/{data.compRecord.id}" class="active:-left-0.5!">
      <ArrowLeftIcon class="text-theme" />
      <div class="flex grow flex-col">
        Comp page
        <span class="text-xs font-light">Switch survey</span>
      </div>
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
        <span class="text-xs font-light">Switch comp</span>
      </div>
    </Anchor>
    <div class="flex flex-wrap gap-2">
      <Anchor route="settings" class="grow basis-48" style="view-transition-name:settings">
        <SettingsIcon class="text-theme" />
        <div class="flex grow flex-col">
          Settings
          <span class="text-xs font-light">App config</span>
        </div>
        <ArrowRightIcon class="text-theme" />
      </Anchor>
      <Anchor route="about" class="grow basis-48" style="view-transition-name:about">
        <InfoIcon class="text-theme" />
        <div class="flex grow flex-col">
          About
          <span class="text-xs font-light">Info, Guides</span>
        </div>
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    </div>
    <span class="text-sm" style="view-transition-name:meanscout-version">
      {import.meta.env.VITE_GIT_COMMIT_HASH}
      <span class="text-xs">({new Date(import.meta.env.VITE_GIT_COMMIT_DATE).toLocaleDateString()})</span>
    </span>
  </div>
{/snippet}

{#snippet entryOverview(match: number | undefined, team: string | undefined, teamName: string | undefined)}
  <div class="flex items-center gap-x-4 gap-y-2">
    {#if match !== undefined}
      <div class="flex flex-col">
        <span class="text-xs font-light">Match</span>
        <span>{match}</span>
      </div>
    {/if}
    {#if team}
      <div class="flex flex-col">
        <span class="text-xs font-light">{teamName || "Team"}</span>
        <span>{team}</span>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet teamRow(match: Match)}
  <Button onclick={() => openDialog(ViewMatchDialog, { pageData: data, match })} class="flex-nowrap! text-center!">
    <div class="min-w-8">{match.number}</div>
    <div class="flex flex-wrap gap-x-2">
      <div class="text-red flex flex-wrap gap-x-2">
        <div class="min-w-13 {getMatchTeamFontWeight(match.red1)}">{match.red1}</div>
        <div class="min-w-13 {getMatchTeamFontWeight(match.red2)}">{match.red2}</div>
        <div class="min-w-13 {getMatchTeamFontWeight(match.red3)}">{match.red3}</div>
      </div>
      <div class="text-blue flex flex-wrap gap-x-2">
        <div class="min-w-13 {getMatchTeamFontWeight(match.blue1)}">{match.blue1}</div>
        <div class="min-w-13 {getMatchTeamFontWeight(match.blue2)}">{match.blue2}</div>
        <div class="min-w-13 {getMatchTeamFontWeight(match.blue3)}">{match.blue3}</div>
      </div>
    </div>
  </Button>
{/snippet}
