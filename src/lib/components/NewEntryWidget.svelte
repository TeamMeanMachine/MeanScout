<script lang="ts">
  import { compareMatches, matchLevels, matchUrl, type Match, type MatchIdentifier, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import { type Entry } from "$lib/entry";
  import { getDefaultFieldValue, getFieldsWithDetails } from "$lib/field";
  import { idb } from "$lib/idb";
  import { targetStore } from "$lib/settings";
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ListOrderedIcon,
    PlusIcon,
    SquareCheckBigIcon,
    SquareIcon,
    XIcon,
  } from "@lucide/svelte";
  import NewScoutDialog from "$lib/dialogs/NewScoutDialog.svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import type { CompPageData } from "$lib/comp";
  import type { MatchSurvey, PitSurvey } from "$lib/survey";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import Anchor from "./Anchor.svelte";
  import SelectMatchDialog from "$lib/dialogs/SelectMatchDialog.svelte";
  import { fly, type FlyParams, slide } from "svelte/transition";

  let {
    pageData,
    newEntry = $bindable(),
    oncancel,
  }: {
    pageData: CompPageData & {
      matches: (Match & { extraTeams?: string[] })[];
      lastCompletedMatch?: MatchIdentifier | undefined;
      teamNames: Map<string, string>;
    };
    newEntry:
      | {
          type: "match";
          survey: MatchSurvey;
          prefills: {
            match: MatchIdentifier;
            team: string;
            scout?: string | undefined;
          };
          state: {
            match: MatchIdentifier;
            team: string;
            scout?: string | undefined;
            prediction?: "red" | "blue" | undefined;
            predictionReason?: string | undefined;
          };
        }
      | {
          type: "pit";
          survey: PitSurvey;
          prefills: {
            team: string;
            scout?: string | undefined;
          };
          state: {
            team: string;
            scout?: string | undefined;
          };
        };
    oncancel: () => void;
  } = $props();

  const fieldRecords = $derived(pageData.fieldRecords.filter((field) => field.surveyId == newEntry.survey.id));
  const fieldsWithDetails = $derived(getFieldsWithDetails(newEntry.survey, fieldRecords));

  const defaultTeamsMove: FlyParams = { y: -12, opacity: 1 };
  const id = idb.generateId();

  const suggestedScouts = $derived(
    new Set([
      ...pageData.entryRecords.map((entry) => entry.scout).filter((scout) => scout !== undefined),
      ...(pageData.compRecord.scouts || []),
    ])
      .values()
      .toArray()
      .toSorted((a, b) => a.localeCompare(b)),
  );

  const adjacentMatches = $derived.by(() => {
    if (newEntry.type != "match") return { previous: undefined, next: undefined };
    const previous = pageData.matches.findLast((m) => compareMatches(m, newEntry.state.match) < 0);
    const next = pageData.matches.find((m) => compareMatches(m, newEntry.state.match) > 0);
    return { previous, next };
  });

  let teamsMoveAnim = $state<FlyParams>(defaultTeamsMove);
  let teamMoveAnimReset: number | undefined = undefined;

  const matchingEntries = $derived.by(() => {
    const uniqueString = uniqueEntryString(
      newEntry.state.team,
      newEntry.type == "match" ? newEntry.state.match : undefined,
    );

    return pageData.entryRecords.filter((e) => {
      const existingUniqueString = uniqueEntryString(
        e.team,
        e.type == "match" ? { number: e.match, set: e.matchSet, level: e.matchLevel } : undefined,
      );

      return uniqueString == existingUniqueString;
    });
  });

  let error = $state("");

  const matchData = $derived(
    newEntry.type == "match" ? pageData.matches.find((m) => compareMatches(m, newEntry.state.match) == 0) : undefined,
  );

  const suggestedTeams = $derived.by(() => {
    const teamSet = new Set<string>();

    if (matchData && newEntry.type == "match") {
      switch ($targetStore) {
        case "red 1":
          teamSet.add(matchData.red1);
          break;
        case "red 2":
          teamSet.add(matchData.red2);
          break;
        case "red 3":
          teamSet.add(matchData.red3);
          break;
        case "blue 1":
          teamSet.add(matchData.blue1);
          break;
        case "blue 2":
          teamSet.add(matchData.blue2);
          break;
        case "blue 3":
          teamSet.add(matchData.blue3);
          break;
      }

      for (const team of pageData.compRecord.teams) {
        if (
          !pageData.compRecord.matches
            .flatMap((match) => [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3])
            .includes(team.number)
        ) {
          teamSet.add(team.number);
        }
      }
    } else {
      for (const team of pageData.compRecord.teams) {
        if (
          pageData.entryRecords.find(
            (e) => e.type == "pit" && e.surveyId == newEntry.survey.id && e.team == team.number,
          )
        ) {
          continue;
        }

        teamSet.add(team.number);
      }
    }

    return [...teamSet]
      .map((team): Team => pageData.compRecord.teams.find((t) => t.number == team) || { number: team, name: "" })
      .toSorted((a, b) => parseInt(a.number) - parseInt(b.number));
  });

  function onconfirm() {
    newEntry.state.team = newEntry.state.team.trim();
    newEntry.state.scout = newEntry.state.scout?.trim();
    if (newEntry.type == "match") {
      newEntry.state.predictionReason = newEntry.state.predictionReason?.trim();
    }

    if (!/^\d{1,5}[A-Z]?$/.test(newEntry.state.team)) {
      error = "invalid value for team";
      return;
    }

    if (suggestedTeams.length && !suggestedTeams.some((t) => t.number == newEntry.state.team)) {
      error = "team is not listed";
      return;
    }

    if (pageData.compRecord.scouts && !newEntry.state.scout) {
      error = "scout name missing";
      return;
    }

    if (newEntry.type == "match" && !/\d{1,3}/.test(`${newEntry.state.match.number}`)) {
      error = "invalid value for match";
      return;
    }

    const defaultValues = fieldsWithDetails.orderedSingle.map((field) => getDefaultFieldValue(field.field));

    let entry: Entry;
    if (newEntry.type == "match") {
      entry = {
        id,
        surveyId: newEntry.survey.id,
        type: "match",
        status: "draft",
        team: newEntry.state.team,
        match: newEntry.state.match.number,
        absent: false,
        values: defaultValues,
        created: new Date(),
        modified: new Date(),
      };

      if (newEntry.state.match.set && newEntry.state.match.set > 1) {
        entry.matchSet = newEntry.state.match.set;
      }

      if (newEntry.state.match.level && newEntry.state.match.level != "qm") {
        entry.matchLevel = newEntry.state.match.level;
      }

      if (newEntry.state.scout) {
        entry.scout = newEntry.state.scout;
        if (newEntry.state.prediction) {
          entry.prediction = newEntry.state.prediction;
          if (newEntry.state.predictionReason) {
            entry.predictionReason = newEntry.state.predictionReason;
          }
        }
      }
    } else {
      entry = {
        id,
        surveyId: newEntry.survey.id,
        type: "pit",
        status: "draft",
        team: newEntry.state.team,
        values: defaultValues,
        created: new Date(),
        modified: new Date(),
      };

      if (newEntry.state.scout) {
        entry.scout = newEntry.state.scout;
      }
    }

    const addRequest = idb.add("entries", $state.snapshot(entry));
    addRequest.onerror = () => {
      error = "Could not create new entry";
    };

    addRequest.onsuccess = () => {
      sessionStorage.removeItem("new-entry");
      idb.put("surveys", { ...$state.snapshot(newEntry.survey), modified: new Date() }).onsuccess = () => {
        goto(`#/entry/${entry.id}`, { invalidateAll: true });
      };
    };
  }

  function uniqueEntryString(team: string, match?: MatchIdentifier | undefined) {
    if (!match) {
      return team;
    }

    return team + "_" + (match.level || "qm") + (match.set || 1) + "_" + match.number;
  }

  function selectTargetTeamFromMatch(identifier: MatchIdentifier) {
    const match = pageData.matches.find((m) => compareMatches(m, identifier) == 0);
    if (!match) return "";
    switch ($targetStore) {
      case "red 1":
        return match.red1;
      case "red 2":
        return match.red2;
      case "red 3":
        return match.red3;
      case "blue 1":
        return match.blue1;
      case "blue 2":
        return match.blue2;
      case "blue 3":
        return match.blue3;
    }
    return "";
  }

  function teamUnderline(teamNumber?: string) {
    return teamNumber == newEntry.state.team ? "underline" : "";
  }

  function teamBold(teamNumber?: string) {
    return teamNumber == newEntry.state.team ? "font-bold" : "font-light";
  }
</script>

<div class="mt-3 flex flex-wrap items-center justify-between gap-2">
  <div class="flex flex-col">
    <span class="text-sm">{newEntry.survey.name}</span>
  </div>
</div>

{#if pageData.compRecord.scouts}
  <div class="flex flex-col">
    Your name
    <div class="flex flex-wrap gap-x-4 gap-y-2">
      {#if suggestedScouts.length}
        <select bind:value={newEntry.state.scout} class="text-theme grow bg-neutral-800 p-2">
          {#each suggestedScouts as scout}
            <option>{scout}</option>
          {/each}
        </select>
      {/if}
      <Button
        onclick={() => {
          openDialog(NewScoutDialog, {
            scouts: pageData.compRecord.scouts || [],
            onadd(newScout) {
              pageData = {
                ...pageData,
                compRecord: {
                  ...pageData.compRecord,
                  scouts: [...(pageData.compRecord.scouts || []), newScout],
                  modified: new Date(),
                },
              };
              idb.put("comps", $state.snapshot(pageData.compRecord)).onsuccess = invalidateAll;
              newEntry.state.scout = newScout;
            },
          });
        }}
        class={suggestedScouts.length ? "" : "w-full"}
      >
        <PlusIcon class="text-theme" />
        {#if !suggestedScouts.length}
          New scout
        {/if}
      </Button>
    </div>
  </div>
{/if}

{#if newEntry.type == "match"}
  <div class="flex flex-wrap gap-x-4 gap-y-3" transition:slide>
    <div class="flex flex-col">
      Match
      <Button
        onclick={() => {
          openDialog(SelectMatchDialog, {
            matches: pageData.matches,
            lastCompletedMatch: pageData.lastCompletedMatch,
            prefilled: newEntry.state.match,
            onselect(match) {
              newEntry.state.match = $state.snapshot(match);
              newEntry.state.team = selectTargetTeamFromMatch(newEntry.state.match);
              closeDialog();
            },
          });
        }}
        class="text-sm"
      >
        <ListOrderedIcon class="text-theme" />
        Select
      </Button>
    </div>

    <div class="flex items-end gap-2">
      <Button
        disabled={!adjacentMatches.previous && newEntry.state.match.number <= 1}
        onclick={() => {
          window.clearTimeout(teamMoveAnimReset);
          teamsMoveAnim = { x: -12, opacity: 1 };

          if (
            !adjacentMatches.previous ||
            (newEntry.state.match.set == adjacentMatches.previous.set &&
              newEntry.state.match.level == adjacentMatches.previous.level)
          ) {
            newEntry.state.match.number--;
          } else {
            newEntry.state.match = structuredClone(adjacentMatches.previous);
          }

          newEntry.state.team = selectTargetTeamFromMatch(newEntry.state.match);
          teamMoveAnimReset = window.setTimeout(() => (teamsMoveAnim = defaultTeamsMove), 500);
        }}
        class="active:translate-y-0! enabled:active:-translate-x-0.5!"
      >
        <ArrowLeftIcon class="text-theme" />
      </Button>
      <Button
        onclick={() => {
          window.clearTimeout(teamMoveAnimReset);
          teamsMoveAnim = { x: 12, opacity: 1 };

          if (
            !adjacentMatches.next ||
            (newEntry.state.match.set == adjacentMatches.next.set &&
              newEntry.state.match.level == adjacentMatches.next.level)
          ) {
            newEntry.state.match.number++;
          } else {
            newEntry.state.match = structuredClone(adjacentMatches.next);
          }

          newEntry.state.team = selectTargetTeamFromMatch(newEntry.state.match);
          teamMoveAnimReset = window.setTimeout(() => (teamsMoveAnim = defaultTeamsMove), 500);
        }}
        class="active:translate-y-0! enabled:active:translate-x-0.5!"
      >
        <ArrowRightIcon class="text-theme" />
      </Button>
    </div>

    <div class="flex items-end gap-2">
      <label class="flex basis-32 flex-col">
        <span class="text-xs font-light">Number</span>
        <input
          type="number"
          bind:value={newEntry.state.match.number}
          oninput={() => {
            newEntry.state.team = selectTargetTeamFromMatch(newEntry.state.match);
          }}
          min="1"
          class="text-theme w-full bg-neutral-800 p-2"
        />
      </label>
      <label class="flex basis-28 flex-col">
        <span class="text-xs font-light">Set</span>
        <input
          type="number"
          bind:value={newEntry.state.match.set}
          oninput={() => {
            newEntry.state.team = selectTargetTeamFromMatch(newEntry.state.match);
          }}
          min="1"
          class="text-theme w-full bg-neutral-800 p-2"
        />
      </label>
      <label class="flex flex-col">
        <span class="text-xs font-light">Level</span>
        <select
          bind:value={newEntry.state.match.level}
          onchange={() => {
            newEntry.state.team = selectTargetTeamFromMatch(newEntry.state.match);
          }}
          class="text-theme bg-neutral-800 p-2"
        >
          {#each matchLevels as level}
            <option value={level}>{level}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>
{/if}

{#if matchData && newEntry.type == "match"}
  {@const { red1, red2, red3, blue1, blue2, blue3 } = matchData}

  <div class="flex flex-col" transition:slide>
    {#key matchData}
      <div class="flex flex-col" in:fly={teamsMoveAnim}>
        <div class="flex items-end justify-between">
          <span>Team</span>
          {#if $targetStore != "pit"}
            <span class="text-theme text-sm font-bold capitalize">{$targetStore}</span>
          {/if}
        </div>

        {#if red1 && red2 && red3 && blue1 && blue2 && blue3}
          <div class="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
            <Button
              onclick={() => {
                newEntry.state.team = red1;
                $targetStore = "red 1";
              }}
              class="w-full max-sm:order-1"
            >
              <div class="flex flex-col truncate {teamBold(red1)}">
                <span class="text-red {teamUnderline(red1)}">{red1}</span>
                <span class="truncate text-xs">{pageData.teamNames.get(red1)}</span>
              </div>
            </Button>
            <Button
              onclick={() => {
                newEntry.state.team = red2;
                $targetStore = "red 2";
              }}
              class="w-full max-sm:order-3"
            >
              <div class="flex flex-col truncate {teamBold(red2)}">
                <span class="text-red {teamUnderline(red2)}">{red2}</span>
                <span class="truncate text-xs">{pageData.teamNames.get(red2)}</span>
              </div>
            </Button>
            <Button
              onclick={() => {
                newEntry.state.team = red3;
                $targetStore = "red 3";
              }}
              class="w-full max-sm:order-5"
            >
              <div class="flex flex-col truncate {teamBold(red3)}">
                <span class="text-red {teamUnderline(red3)}">{red3}</span>
                <span class="truncate text-xs">{pageData.teamNames.get(red3)}</span>
              </div>
            </Button>

            <Button
              onclick={() => {
                newEntry.state.team = blue1;
                $targetStore = "blue 1";
              }}
              class="w-full max-sm:order-2"
            >
              <div class="flex flex-col truncate {teamBold(blue1)}">
                <span class="text-blue {teamUnderline(blue1)}">{blue1}</span>
                <span class="truncate text-xs">{pageData.teamNames.get(blue1)}</span>
              </div>
            </Button>
            <Button
              onclick={() => {
                newEntry.state.team = blue2;
                $targetStore = "blue 2";
              }}
              class="w-full max-sm:order-4"
            >
              <div class="flex flex-col truncate {teamBold(blue2)}">
                <span class="text-blue {teamUnderline(blue2)}">{blue2}</span>
                <span class="truncate text-xs">{pageData.teamNames.get(blue2)}</span>
              </div>
            </Button>
            <Button
              onclick={() => {
                newEntry.state.team = blue3;
                $targetStore = "blue 3";
              }}
              class="w-full max-sm:order-6"
            >
              <div class="flex flex-col truncate {teamBold(blue3)}">
                <span class="text-blue {teamUnderline(blue3)}">{blue3}</span>
                <span class="truncate text-xs">{pageData.teamNames.get(blue3)}</span>
              </div>
            </Button>
          </div>
        {:else if suggestedTeams.length}
          <label class="flex flex-col">
            <select bind:value={newEntry.state.team} class="text-theme bg-neutral-800 p-2">
              {#each suggestedTeams as team}
                <option value={team.number}>{team.number} {team.name}</option>
              {/each}
            </select>
          </label>
        {:else}
          <label class="flex flex-col">
            <input bind:value={newEntry.state.team} class="text-theme bg-neutral-800 p-2" />
          </label>
        {/if}

        {#if matchData.extraTeams}
          <div class="mt-2 grid grid-cols-3 gap-2">
            {#each matchData.extraTeams || [] as extraTeam}
              <Button
                onclick={() => {
                  newEntry.state.team = extraTeam;
                }}
                class="w-full"
              >
                <div class="flex flex-col truncate {teamBold(extraTeam)}">
                  <span class={teamUnderline(extraTeam)}>{extraTeam}</span>
                  <span class="truncate text-xs">{pageData.teamNames.get(extraTeam)}</span>
                </div>
              </Button>
            {/each}
          </div>
        {/if}

        <Anchor route={matchUrl(newEntry.state.match, pageData.compRecord.id)} class="mt-6">
          <ListOrderedIcon class="text-theme" />
          <div class="flex grow flex-col">
            Match
            {#if newEntry.state.match.level && newEntry.state.match.level != "qm"}
              {newEntry.state.match.level}{newEntry.state.match.set || 1}-{newEntry.state.match.number}
            {:else}
              {newEntry.state.match.number}
            {/if}
            <span class="text-xs font-light">Analyze existing data</span>
          </div>
          <ArrowRightIcon class="text-theme" />
        </Anchor>
      </div>
    {/key}
  </div>
{:else if suggestedTeams.length}
  <label class="flex flex-col">
    Team
    <select bind:value={newEntry.state.team} class="text-theme bg-neutral-800 p-2">
      {#each suggestedTeams as team}
        <option value={team.number}>{team.number} {team.name}</option>
      {/each}
    </select>
  </label>
{:else}
  <label class="flex flex-col">
    Team
    <input bind:value={newEntry.state.team} class="text-theme bg-neutral-800 p-2" />
  </label>
{/if}

{#if newEntry.type == "match" && pageData.compRecord.scouts}
  <div class="flex flex-col" transition:slide>
    <span>Your guess</span>
    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => (newEntry.state.prediction = newEntry.state.prediction == "red" ? undefined : "red")}
        class="text-red grow basis-[150px] {newEntry.state.prediction == 'red' ? 'font-bold uppercase' : 'font-light'}"
      >
        {#if newEntry.state.prediction == "red"}
          <SquareCheckBigIcon />
        {:else}
          <SquareIcon />
        {/if}
        Red wins
      </Button>
      <Button
        onclick={() => (newEntry.state.prediction = newEntry.state.prediction == "blue" ? undefined : "blue")}
        class="text-blue grow basis-[150px] {newEntry.state.prediction == 'blue'
          ? 'font-bold uppercase'
          : 'font-light'}"
      >
        {#if newEntry.state.prediction == "blue"}
          <SquareCheckBigIcon />
        {:else}
          <SquareIcon />
        {/if}
        Blue wins
      </Button>
    </div>
  </div>

  {#if newEntry.state.prediction}
    <label class="flex flex-col" transition:slide>
      Reason
      <input bind:value={newEntry.state.predictionReason} class="text-theme bg-neutral-800 p-2" />
    </label>
  {/if}
{/if}

{#if matchingEntries.length}
  <div class="flex flex-col gap-2" transition:slide>
    <div class="flex flex-col">
      <h2 class="font-bold">Matching Entries</h2>
      <span class="text-xs font-light">If you already have an existing draft, consider editing it.</span>
      <span class="text-xs font-light">You can view, edit, or delete them (and other matching entries) here.</span>
    </div>

    {#each matchingEntries as entry (entry.id)}
      <div class="flex flex-col" in:slide={{ delay: 50 }}>
        <Button
          onclick={() => {
            openDialog(ViewEntryDialog, {
              compRecord: pageData.compRecord,
              surveyRecord: newEntry.survey,
              fieldRecords: pageData.fieldRecords,
              entryRecord: entry,
              onchange: invalidateAll,
            });
          }}
          class="gap-x-4"
        >
          {#if entry.type == "match"}
            <div class="flex w-9 flex-col text-nowrap">
              <span class="text-xs font-light">Match</span>
              <div>
                {#if entry.matchLevel && entry.matchLevel != "qm"}
                  <span class="text-xs">{entry.matchLevel}{entry.matchSet || 1}-{entry.match}</span>
                {:else}
                  {entry.match}
                {/if}
              </div>
            </div>
          {:else if entry.type == "pit"}
            <div class="flex w-9 flex-col">
              <span class="text-sm">Pit</span>
            </div>
          {/if}
          <div class="flex w-32 max-w-full flex-col">
            <span class="overflow-hidden text-xs font-light text-nowrap text-ellipsis">
              {pageData.compRecord.teams.find((t) => t.number == entry.team)?.name || "Team"}
            </span>
            <span>{entry.team}</span>
          </div>
          {#if entry.scout}
            <div class="flex w-24 max-w-full flex-col">
              <span class="text-xs font-light text-wrap">Scout</span>
              <span class="overflow-hidden text-nowrap text-ellipsis">{entry.scout}</span>
            </div>
          {/if}
          <div class="flex flex-col">
            {#if entry.type == "match" && entry.absent}
              <span class="text-xs">Absent</span>
            {/if}
            {#if entry.status != "submitted"}
              <span class="text-xs capitalize">{entry.status}</span>
            {/if}
          </div>
        </Button>
      </div>
    {/each}
  </div>
{/if}

{#if error}
  <span transition:slide>Error: {error}</span>
{/if}

<div class="mt-3 flex flex-wrap gap-3 text-sm">
  <Button onclick={onconfirm} class="w-24 flex-col gap-1!">
    <PlusIcon class="text-theme" />
    Create
  </Button>
  <Button onclick={oncancel} class="w-24 flex-col gap-1!">
    <XIcon class="text-theme" />
    Cancel
  </Button>
</div>
