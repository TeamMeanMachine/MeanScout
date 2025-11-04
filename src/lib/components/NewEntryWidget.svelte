<script lang="ts">
  import { compareMatches, matchIdentifierSchema, matchUrl, type MatchIdentifier, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
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
  import type { Survey } from "$lib/survey";
  import { z } from "zod";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import Anchor from "./Anchor.svelte";

  let {
    pageData,
    surveyRecord,
    prefills,
    oncancel,
  }: {
    pageData: CompPageData;
    surveyRecord: Survey;
    prefills: {
      match: MatchIdentifier;
      team: string;
      scout: string | undefined;
    };
    oncancel: () => void;
  } = $props();

  const teamNumberNameMap = new Map<string, string>();
  for (const team of pageData.compRecord.teams) {
    teamNumberNameMap.set(team.number, team.name);
  }

  const fieldRecords = pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id);
  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

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

  const newEntryStateSchema = z
    .object({
      match: matchIdentifierSchema,
      team: z.string(),
      scout: z.string().optional(),
      prediction: z.union([z.literal("red"), z.literal("blue"), z.undefined()]),
      predictionReason: z.string().optional(),
    })
    .catch({
      match: prefills.match,
      team: prefills.team,
      scout: prefills.scout,
      prediction: undefined,
      predictionReason: undefined,
    });

  function getNewEntryState() {
    try {
      return JSON.parse(sessionStorage.getItem(`${surveyRecord.id}-new-entry-state`) ?? "null");
    } catch {}
  }

  const newEntryState = $state(newEntryStateSchema.parse(getNewEntryState()));

  const adjacentMatches = $derived.by(() => {
    const sortedMatches = pageData.compRecord.matches.toSorted(compareMatches);
    const previous = sortedMatches.findLast((m) => compareMatches(newEntryState.match, m) > 0);
    const next = sortedMatches.find((m) => compareMatches(newEntryState.match, m) < 0);
    return { previous, next };
  });

  function uniqueEntryString(team: string, match?: MatchIdentifier | undefined) {
    if (!match) {
      return team;
    }

    return team + "_" + (match.level || "qm") + (match.set || 1) + "_" + match.number;
  }

  const matchingEntries = $derived.by(() => {
    const uniqueString = uniqueEntryString(
      newEntryState.team,
      surveyRecord.type == "match" ? newEntryState.match : undefined,
    );

    return pageData.entryRecords.filter((e) => {
      const existingUniqueString = uniqueEntryString(
        e.team,
        e.type == "match" ? { number: e.match, set: e.matchSet, level: e.matchLevel } : undefined,
      );

      return uniqueString == existingUniqueString;
    });
  });

  function selectTargetTeamFromMatch(identifier: MatchIdentifier) {
    const match = pageData.compRecord.matches.find((m) => compareMatches(m, identifier) == 0);
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

  $effect(() => {
    sessionStorage.setItem(`${surveyRecord.id}-new-entry-state`, JSON.stringify(newEntryState));
  });

  let error = $state("");

  const matchData = $derived(pageData.compRecord.matches.find((m) => compareMatches(m, newEntryState.match) == 0));

  const suggestedTeams = $derived.by(() => {
    newEntryState.match;
    const teamSet = new Set<string>();

    if (matchData && surveyRecord.type == "match") {
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
          pageData.entryRecords.find((e) => e.type == "pit" && e.surveyId == surveyRecord.id && e.team == team.number)
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
    newEntryState.team = newEntryState.team.trim();
    newEntryState.scout = newEntryState.scout?.trim();
    newEntryState.predictionReason = newEntryState.predictionReason?.trim();

    if (!/^\d{1,5}[A-Z]?$/.test(newEntryState.team)) {
      error = "invalid value for team";
      return;
    }

    if (suggestedTeams.length && !suggestedTeams.some((t) => t.number == newEntryState.team)) {
      error = "team is not listed";
      return;
    }

    if (pageData.compRecord.scouts && !newEntryState.scout) {
      error = "scout name missing";
      return;
    }

    if (surveyRecord.type == "match" && !/\d{1,3}/.test(`${newEntryState.match.number}`)) {
      error = "invalid value for match";
      return;
    }

    const defaultValues = fieldsWithDetails.orderedSingle.map((field) => getDefaultFieldValue(field.field));

    let entry: Entry;
    if (surveyRecord.type == "match") {
      entry = {
        id,
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "draft",
        team: newEntryState.team,
        match: newEntryState.match.number,
        absent: false,
        values: defaultValues,
        created: new Date(),
        modified: new Date(),
      };

      if (newEntryState.match.set && newEntryState.match.set > 1) {
        entry.matchSet = newEntryState.match.set;
      }

      if (newEntryState.match.level && newEntryState.match.level != "qm") {
        entry.matchLevel = newEntryState.match.level;
      }

      if (newEntryState.scout) {
        entry.scout = newEntryState.scout;
        if (newEntryState.prediction) {
          entry.prediction = newEntryState.prediction;
          if (newEntryState.predictionReason) {
            entry.predictionReason = newEntryState.predictionReason;
          }
        }
      }
    } else {
      entry = {
        id,
        surveyId: surveyRecord.id,
        type: surveyRecord.type,
        status: "draft",
        team: newEntryState.team,
        values: defaultValues,
        created: new Date(),
        modified: new Date(),
      };

      if (newEntryState.scout) {
        entry.scout = newEntryState.scout;
      }
    }

    const addRequest = idb.add("entries", $state.snapshot(entry));
    addRequest.onerror = () => {
      error = "Could not create new entry";
    };

    addRequest.onsuccess = () => {
      sessionStorage.removeItem(`${surveyRecord.id}-new-entry-state`);
      sessionStorage.removeItem("new-entry");
      idb.put("surveys", { ...$state.snapshot(surveyRecord), modified: new Date() });
      goto(`#/entry/${entry.id}`);
    };
  }

  function teamUnderline(teamNumber?: string) {
    return teamNumber == newEntryState.team ? "underline" : "";
  }

  function teamBold(teamNumber?: string) {
    return teamNumber == newEntryState.team ? "font-bold" : "font-light";
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <div class="flex flex-col">
    <h2 class="font-bold">New entry</h2>
    <span class="text-xs font-light">{surveyRecord.name}</span>
  </div>
</div>

{#if pageData.compRecord.scouts}
  <div class="flex flex-col">
    Your name
    <div class="flex flex-wrap gap-2">
      {#if suggestedScouts.length}
        <select bind:value={newEntryState.scout} class="text-theme grow bg-neutral-800 p-2">
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
              newEntryState.scout = newScout;
            },
          });
        }}
        class={pageData.compRecord.scouts.length ? "" : "w-full"}
      >
        <PlusIcon class="text-theme" />
        {#if !pageData.compRecord.scouts.length}
          New scout
        {/if}
      </Button>
    </div>
  </div>
{/if}

{#if surveyRecord.type == "match"}
  <div class="flex items-end gap-2">
    <label class="flex grow flex-col">
      Match
      {#if newEntryState.match.level && newEntryState.match.level != "qm"}
        {newEntryState.match.level}{newEntryState.match.set || 1}
      {/if}
      <input
        type="number"
        bind:value={newEntryState.match.number}
        oninput={() => {
          newEntryState.match.level = undefined;
          newEntryState.match.set = undefined;
          newEntryState.team = selectTargetTeamFromMatch(newEntryState.match);
        }}
        min="1"
        class="text-theme w-full bg-neutral-800 p-2"
      />
    </label>
    <Button
      disabled={!adjacentMatches.previous}
      onclick={() => {
        if (!adjacentMatches.previous) return;
        newEntryState.match = adjacentMatches.previous;
        newEntryState.team = selectTargetTeamFromMatch(newEntryState.match);
      }}
      class="active:translate-y-0! enabled:active:-translate-x-0.5!"
    >
      <ArrowLeftIcon class="text-theme" />
    </Button>
    <Button
      disabled={!adjacentMatches.next}
      onclick={() => {
        if (!adjacentMatches.next) return;
        newEntryState.match = adjacentMatches.next;
        newEntryState.team = selectTargetTeamFromMatch(newEntryState.match);
      }}
      class="active:translate-y-0! enabled:active:translate-x-0.5!"
    >
      <ArrowRightIcon class="text-theme" />
    </Button>
  </div>
{/if}

{#if matchData}
  {@const { red1, red2, red3, blue1, blue2, blue3 } = matchData}

  <div class="flex flex-col">
    <div class="flex items-end justify-between">
      <span>Team</span>
      {#if $targetStore != "pit"}
        <span class="text-theme text-sm font-bold capitalize">{$targetStore}</span>
      {/if}
    </div>

    <div class="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
      <Button
        onclick={() => {
          newEntryState.team = red1;
          $targetStore = "red 1";
        }}
        class="w-full max-sm:order-1"
      >
        <div class="flex flex-col truncate {teamBold(red1)}">
          <span class="text-red {teamUnderline(red1)}">{red1}</span>
          <span class="truncate text-xs">{teamNumberNameMap.get(red1)}</span>
        </div>
      </Button>
      <Button
        onclick={() => {
          newEntryState.team = red2;
          $targetStore = "red 2";
        }}
        class="w-full max-sm:order-3"
      >
        <div class="flex flex-col truncate {teamBold(red2)}">
          <span class="text-red {teamUnderline(red2)}">{red2}</span>
          <span class="truncate text-xs">{teamNumberNameMap.get(red2)}</span>
        </div>
      </Button>
      <Button
        onclick={() => {
          newEntryState.team = red3;
          $targetStore = "red 3";
        }}
        class="w-full max-sm:order-5"
      >
        <div class="flex flex-col truncate {teamBold(red3)}">
          <span class="text-red {teamUnderline(red3)}">{red3}</span>
          <span class="truncate text-xs">{teamNumberNameMap.get(red3)}</span>
        </div>
      </Button>

      <Button
        onclick={() => {
          newEntryState.team = blue1;
          $targetStore = "blue 1";
        }}
        class="w-full max-sm:order-2"
      >
        <div class="flex flex-col truncate {teamBold(blue1)}">
          <span class="text-blue {teamUnderline(blue1)}">{blue1}</span>
          <span class="truncate text-xs">{teamNumberNameMap.get(blue1)}</span>
        </div>
      </Button>
      <Button
        onclick={() => {
          newEntryState.team = blue2;
          $targetStore = "blue 2";
        }}
        class="w-full max-sm:order-4"
      >
        <div class="flex flex-col truncate {teamBold(blue2)}">
          <span class="text-blue {teamUnderline(blue2)}">{blue2}</span>
          <span class="truncate text-xs">{teamNumberNameMap.get(blue2)}</span>
        </div>
      </Button>
      <Button
        onclick={() => {
          newEntryState.team = blue3;
          $targetStore = "blue 3";
        }}
        class="w-full max-sm:order-6"
      >
        <div class="flex flex-col truncate {teamBold(blue3)}">
          <span class="text-blue {teamUnderline(blue3)}">{blue3}</span>
          <span class="truncate text-xs">{teamNumberNameMap.get(blue3)}</span>
        </div>
      </Button>
    </div>
  </div>
{:else if suggestedTeams.length}
  <label class="flex flex-col">
    Team
    <select bind:value={newEntryState.team} class="text-theme bg-neutral-800 p-2">
      {#each suggestedTeams as team}
        <option value={team.number}>{team.number} {team.name}</option>
      {/each}
    </select>
  </label>
{:else}
  <label class="flex flex-col">
    Team
    <input bind:value={newEntryState.team} class="text-theme bg-neutral-800 p-2" />
  </label>
{/if}

{#if matchData}
  <Anchor route={matchUrl(newEntryState.match, pageData.compRecord.id)} class="mt-3">
    <ListOrderedIcon class="text-theme" />
    <div class="flex grow flex-col">
      Match
      {#if newEntryState.match.level && newEntryState.match.level != "qm"}
        {newEntryState.match.level}{newEntryState.match.set || 1}-{newEntryState.match.number}
      {:else}
        {newEntryState.match.number}
      {/if}
      <span class="text-xs font-light">Analyze existing data</span>
    </div>
    <ArrowRightIcon class="text-theme" />
  </Anchor>
{/if}

{#if surveyRecord.type == "match" && pageData.compRecord.scouts}
  <div class="flex flex-col">
    <span>Your guess</span>
    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => (newEntryState.prediction = newEntryState.prediction == "red" ? undefined : "red")}
        class="text-red grow basis-[150px] {newEntryState.prediction == 'red' ? 'font-bold uppercase' : 'font-light'}"
      >
        {#if newEntryState.prediction == "red"}
          <SquareCheckBigIcon />
        {:else}
          <SquareIcon />
        {/if}
        Red wins
      </Button>
      <Button
        onclick={() => (newEntryState.prediction = newEntryState.prediction == "blue" ? undefined : "blue")}
        class="text-blue grow basis-[150px] {newEntryState.prediction == 'blue' ? 'font-bold uppercase' : 'font-light'}"
      >
        {#if newEntryState.prediction == "blue"}
          <SquareCheckBigIcon />
        {:else}
          <SquareIcon />
        {/if}
        Blue wins
      </Button>
    </div>
  </div>

  {#if newEntryState.prediction}
    <label class="flex flex-col">
      Reason
      <input bind:value={newEntryState.predictionReason} class="text-theme bg-neutral-800 p-2" />
    </label>
  {/if}
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}

{#if matchingEntries.length}
  <div class="my-3 flex flex-col gap-2">
    <div class="flex flex-col">
      <h2 class="font-bold">Matching Entries</h2>
      <span class="text-xs font-light">Consider editing an existing entry, instead of creating a new one.</span>
      <span class="text-xs font-light">You can view, edit, or delete them here.</span>
    </div>

    {#each matchingEntries as entry (entry.id)}
      <Button
        onclick={() => {
          openDialog(ViewEntryDialog, {
            compRecord: pageData.compRecord,
            surveyRecord,
            fieldRecords: pageData.fieldRecords,
            entryRecord: entry,
            onchange: invalidateAll,
          });
        }}
        class="gap-x-4"
      >
        {#if entry.type == "match"}
          <div class="flex w-9 flex-col">
            <span class="text-xs font-light">Match</span>
            <span>{entry.match}</span>
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
    {/each}
  </div>
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
