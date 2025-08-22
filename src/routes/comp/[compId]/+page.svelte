<script lang="ts">
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import { targetStore, teamStore } from "$lib/settings";
  import {
    ArrowRightIcon,
    ChartBarBigIcon,
    DicesIcon,
    ListOrderedIcon,
    NotepadTextIcon,
    PlusIcon,
    UsersIcon,
  } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import NewEntryDialog from "$lib/dialogs/NewEntryDialog.svelte";
  import { idb } from "$lib/idb";
  import { type Survey } from "$lib/survey";
  import type { Entry, MatchEntry } from "$lib/entry";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { getMatchTeamFontWeight, sessionStorageStore, type Match } from "$lib";
  import { sortExpressions } from "$lib/expression";
  import ViewMatchDialog from "$lib/dialogs/ViewMatchDialog.svelte";
  import { getPredictionsPerScout } from "$lib/prediction";
  import CompPageHeader from "./CompPageHeader.svelte";

  let { data }: PageProps = $props();

  const filterMatches = sessionStorageStore<"true" | "">("filter-matches", "");

  const showAnalysisWidget = $derived(
    data.surveyRecords.some(
      (survey) => survey.type == "match" && (survey.pickLists.length || survey.expressions.length),
    ),
  );

  const pickListCount = $derived(
    data.surveyRecords.reduce((count, survey) => {
      return survey.type == "match" ? count + survey.pickLists.length : 0;
    }, 0),
  );

  const expressionCount = $derived(
    data.surveyRecords.reduce((count, survey) => {
      return survey.type == "match" ? count + survey.expressions.length : 0;
    }, 0),
  );

  const matches = $derived(
    $filterMatches ? data.compRecord.matches.filter(matchHasTeamStore) : data.compRecord.matches,
  );

  const lastCompletedMatch = $derived(
    Math.max(
      ...data.entryRecords.filter((e): e is MatchEntry => e.type == "match" && e.status != "draft").map((e) => e.match),
    ),
  );

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

  const teamCount = $derived(
    new Set([
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

  function getNewEntryPrefills(survey: Survey, entries: Entry[]) {
    const prefills: {
      match: number;
      team: string;
      scout: string | undefined;
    } = {
      match: 0,
      team: "",
      scout: undefined,
    };

    if (survey.type == "match") {
      const recordedMatches = entries.filter((entry) => entry.type == "match").map((entry) => entry.match);
      prefills.match = 1 + Math.max(...recordedMatches, 0);

      const matchData = data.compRecord.matches.find((match) => match.number == prefills.match);
      if (matchData) {
        switch ($targetStore) {
          case "red 1":
            prefills.team = matchData.red1;
            break;
          case "red 2":
            prefills.team = matchData.red2;
            break;
          case "red 3":
            prefills.team = matchData.red3;
            break;
          case "blue 1":
            prefills.team = matchData.blue1;
            break;
          case "blue 2":
            prefills.team = matchData.blue2;
            break;
          case "blue 3":
            prefills.team = matchData.blue3;
            break;
        }
      }

      for (const entry of entries) {
        if (
          entry.scout &&
          entry.type == "match" &&
          data.compRecord.matches.some(
            (m) => m.number == entry.match && m[$targetStore.replace(" ", "") as keyof Match] == entry.team,
          )
        ) {
          prefills.scout = entry.scout;
          break;
        }
      }
    }

    if (survey.type == "pit") {
      const scoutedTeams = entries.map((e) => e.team).toSorted((a, b) => Number(a) - Number(b));
      const unscoutedTeams = data.compRecord.teams
        .filter((t) => !scoutedTeams.includes(t.number))
        .toSorted((a, b) => Number(a.number) - Number(b.number));

      prefills.team = unscoutedTeams[0]?.number || scoutedTeams?.[0] || "";
    }

    if (!prefills.scout && entries[0] && entries[0].scout) {
      prefills.scout = entries[0].scout;
    }

    return prefills;
  }

  function getRecentEntries(entries: Entry[]) {
    return entries
      .filter((e) => {
        if (e.status == "draft") return false;
        if (e.type == "pit") return true;

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
      .toSorted((a, b) => {
        if (a.type == "match" && b.type == "match") {
          return b.match - a.match;
        }
        return b.modified.getTime() - a.modified.getTime();
      })
      .slice(0, 2);
  }

  function matchHasTeamStore(match: Match) {
    return [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3].includes($teamStore);
  }
</script>

<CompPageHeader pageData={data} page="overview" />

<div class="flex flex-col gap-6" style="view-transition-name:comp-{data.compRecord.id}">
  {@render entriesWidget()}

  {#if showAnalysisWidget}
    {@render analysisWidget()}
  {/if}

  {#if data.compRecord.matches.length}
    {@render matchesWidget()}
  {/if}

  {#if teamCount}
    {@render teamsWidget()}
  {/if}

  {#if data.compRecord.scouts}
    {@render predictionsWidget()}
  {/if}
</div>

{#snippet entriesWidget()}
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <NotepadTextIcon class="text-theme shrink-0" />
      <div class="flex grow flex-col">
        <h2 class="font-bold">Entries</h2>
        <span class="text-xs font-light text-balance">
          {data.entryRecords.length} total
        </span>
      </div>
      <Anchor route="comp/{data.compRecord.id}/entries">
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    </div>

    <div class="-m-1 flex gap-3 overflow-x-auto p-1">
      {#each data.surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as surveyRecord (surveyRecord.id)}
        {@const entryRecords = data.entryRecords
          .filter((e) => e.surveyId == surveyRecord.id)
          .toSorted((a, b) => b.modified.getTime() - a.modified.getTime())}

        {@const prefills = getNewEntryPrefills(surveyRecord, entryRecords)}
        {@const drafts = entryRecords.filter((e) => e.status == "draft")}
        {@const entries = getRecentEntries(entryRecords)}

        <div class="flex min-w-64 grow basis-64 flex-col gap-3">
          <Button
            onclick={() => {
              openDialog(NewEntryDialog, {
                pageData: data,
                surveyRecord,
                prefills,
                onnewscout(newScout) {
                  data = {
                    ...data,
                    compRecord: { ...data.compRecord, scouts: [...(data.compRecord.scouts || []), newScout] },
                  };
                  idb.put("comps", $state.snapshot(data.compRecord));
                },
              });
            }}
            class="flex-col items-stretch"
          >
            <div class="flex items-center gap-2">
              <PlusIcon class="text-theme shrink-0" />
              <div class="flex flex-col">
                <span>{surveyRecord.name}</span>
                <span class="text-xs font-light">
                  {entryRecords.filter((e) => e.status != "draft").length}
                  {#if surveyRecord.type == "match" && data.compRecord.matches.length}
                    of {data.compRecord.matches.length * 6}
                  {:else if data.compRecord.teams.length}
                    of {data.compRecord.teams.length}
                  {/if}
                  done
                </span>
              </div>
            </div>
            {@render entryOverview(
              surveyRecord.type == "match" ? prefills.match : undefined,
              prefills.team,
              data.compRecord.teams.find((t) => t.number == prefills.team)?.name,
            )}
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
              <span class="text-xs">
                Recent for
                {#if surveyRecord.type == "match"}
                  <span class="text-theme font-bold capitalize">{$targetStore}</span>
                {:else}
                  <span class="text-orange font-bold capitalize">Pit</span>
                {/if}
              </span>

              <div class="flex flex-col gap-2">
                {#each entries as entry (entry.id)}
                  <Button
                    onclick={() => {
                      openDialog(ViewEntryDialog, {
                        compRecord: data.compRecord,
                        surveyRecord: surveyRecord,
                        fieldRecords: data.fieldRecords,
                        entryRecord: entry,
                        onchange: invalidateAll,
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
      {/each}
    </div>
  </div>
{/snippet}

{#snippet analysisWidget()}
  <div class="flex flex-col gap-3" style="view-transition-name:analysis">
    <div class="flex flex-wrap items-center gap-2">
      <ChartBarBigIcon class="text-theme" />
      <div class="flex grow flex-col">
        <h2 class="font-bold">Analysis</h2>
        <span class="text-xs font-light">
          {#if pickListCount}
            {pickListCount} {pickListCount == 1 ? "pick list" : "pick lists"}{expressionCount ? "," : ""}
          {/if}
          {#if expressionCount}
            {expressionCount} {expressionCount == 1 ? "expression" : "expressions"}
          {/if}
        </span>
      </div>
      <Anchor route="comp/{data.compRecord.id}/analysis">
        <ArrowRightIcon class="text-theme" />
      </Anchor>
    </div>

    <div class="flex flex-col gap-2">
      {#each data.surveyRecords
        .filter((survey) => survey.type == "match")
        .toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as survey (survey.id)}
        {@const expressions = survey.expressions.toSorted(sortExpressions).slice(0, 4 - survey.pickLists.length)}

        <div class="flex flex-col">
          <span class="text-xs">{survey.name}</span>

          <div class="flex flex-col gap-2">
            {#each survey.pickLists as pickList}
              <Button
                onclick={() => {
                  sessionStorage.setItem("analysis-view", `picklist-${pickList.name}`);
                  sessionStorage.setItem("analysis-survey", survey.id);
                  goto(`#/comp/${data.compRecord.id}/analysis`);
                }}
                class="justify-between"
              >
                {pickList.name}
                <ArrowRightIcon class="text-theme" />
              </Button>
            {/each}

            {#each expressions as expression}
              <Button
                onclick={() => {
                  sessionStorage.setItem("analysis-view", `expression-${expression.name}`);
                  sessionStorage.setItem("analysis-survey", survey.id);
                  goto(`#/comp/${data.compRecord.id}/analysis`);
                }}
                class="justify-between"
              >
                {expression.name}
                <ArrowRightIcon class="text-theme" />
              </Button>
            {/each}
          </div>
        </div>
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
          {matchesScouted} scouted of {data.compRecord.matches.length}
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

        <Anchor route="comp/{data.compRecord.id}/matches">
          <ArrowRightIcon class="text-theme" />
        </Anchor>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <div class="flex grow basis-60 flex-col">
        <span class="text-xs">Upcoming</span>
        <div class="flex flex-col gap-2">
          {#each upcomingMatches as match}
            {@render matchRow(match)}
          {:else}
            <span class="text-sm">No upcoming matches.</span>
          {/each}
        </div>
      </div>

      <div class="flex grow basis-60 flex-col">
        <span class="col-span-full text-xs">Previous</span>
        <div class="flex flex-col gap-2">
          {#each previousMatches as match}
            {@render matchRow(match)}
          {:else}
            <span class="text-sm">No previous matches.</span>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/snippet}

{#snippet teamsWidget()}
  <Anchor route="comp/{data.compRecord.id}/teams" style="view-transition-name:teams">
    <UsersIcon class="text-theme" />
    <div class="flex grow flex-col">
      <span class="font-bold">Teams</span>
      <span class="text-xs font-light">{teamCount} total</span>
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
{/snippet}

{#snippet predictionsWidget()}
  {@const { overallAccuracy } = getPredictionsPerScout(
    data.compRecord,
    data.entryRecords.filter((entry) => entry.type == "match"),
  )}

  <Anchor route="comp/{data.compRecord.id}/predictions" style="view-transition-name:predictions">
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

{#snippet matchRow(match: Match)}
  <Button
    onclick={() =>
      openDialog(ViewMatchDialog, {
        pageData: data,
        match,
      })}
    class="flex-nowrap! text-center!"
  >
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
