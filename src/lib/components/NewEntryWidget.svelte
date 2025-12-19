<script lang="ts">
  import {
    compareMatches,
    getTeamName,
    isValidTeam,
    matchIdentifierSchema,
    matchUrl,
    type Match,
    type MatchIdentifier,
    type Team,
  } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog } from "$lib/dialog";
  import { type Entry, type MatchEntry, type PitEntry } from "$lib/entry";
  import { getDefaultFieldValue, getFieldsWithDetails } from "$lib/field";
  import { idb } from "$lib/idb";
  import { targetStore, type Target } from "$lib/settings";
  import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChartBarBigIcon,
    CircleCheckBigIcon,
    CircleIcon,
    PlusIcon,
    SquareCheckBigIcon,
    SquareIcon,
    SquarePenIcon,
  } from "@lucide/svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import type { CompPageData } from "$lib/comp";
  import type { MatchSurvey, PitSurvey } from "$lib/survey";
  import ViewEntryDialog from "$lib/dialogs/ViewEntryDialog.svelte";
  import Anchor from "./Anchor.svelte";
  import SelectMatchDialog from "$lib/dialogs/SelectMatchDialog.svelte";
  import { fly, type FlyParams, slide } from "svelte/transition";
  import { z } from "zod";
  import SelectTeamDialog from "$lib/dialogs/SelectTeamDialog.svelte";
  import SelectScoutDialog from "$lib/dialogs/SelectScoutDialog.svelte";

  let {
    pageData,
  }: {
    pageData: CompPageData & {
      matches: (Match & { extraTeams?: string[] })[];
      lastCompletedMatch?: MatchIdentifier | undefined;
    };
  } = $props();

  type MatchPrefills = {
    match: MatchIdentifier;
    team: string;
    scout?: string | undefined;
  };

  type PitPrefills = {
    team: string;
    scout?: string | undefined;
  };

  const newEntryStateSchema = z.object({
    match: matchIdentifierSchema.optional(),
    team: z.string(),
    scout: z.string().optional(),
    prediction: z.union([z.literal("red"), z.literal("blue")]).optional(),
    predictionReason: z.string().optional(),
  });

  const storedNewEntrySchema = z.object({
    survey: z.string(),
    state: newEntryStateSchema,
  });

  let newEntry = $state(getNewEntry());

  function getNewEntry():
    | {
        type: "match";
        survey: MatchSurvey;
        prefills: MatchPrefills;
        state: MatchPrefills & {
          prediction?: "red" | "blue" | undefined;
          predictionReason?: string | undefined;
        };
      }
    | {
        type: "pit";
        survey: PitSurvey;
        prefills: PitPrefills;
        state: PitPrefills;
      } {
    const storedNewEntry = storedNewEntrySchema.safeParse(
      (() => {
        try {
          return JSON.parse(sessionStorage.getItem("new-entry") ?? "null");
        } catch {}
      })(),
    );

    const survey =
      pageData.surveyRecords.find((s) => s.id == storedNewEntry.data?.survey) ||
      pageData.surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime())[0];

    if (survey.type == "match") {
      const entries = pageData.entryRecords.filter((e) => e.surveyId == survey.id) as MatchEntry[];
      const prefills = getNewMatchEntryPrefills(entries);
      return {
        type: "match",
        survey,
        prefills,
        state: (storedNewEntry.data?.state as MatchPrefills) || structuredClone(prefills),
      };
    } else {
      const entries = pageData.entryRecords.filter((e) => e.surveyId == survey.id) as PitEntry[];
      const prefills = getNewPitEntryPrefills(entries);
      return { type: "pit", survey, prefills, state: storedNewEntry.data?.state || structuredClone(prefills) };
    }
  }

  $effect(() => {
    if (!newEntry) return;
    sessionStorage.setItem(
      "new-entry",
      JSON.stringify($state.snapshot({ survey: newEntry.survey.id, state: newEntry.state })),
    );
  });

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
    const match = newEntry.state.match;

    const previous = pageData.matches.findLast((m) => compareMatches(m, match) < 0);
    const next = pageData.matches.find((m) => compareMatches(m, match) > 0);
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
    pageData.matches.find((m) => newEntry.type == "match" && compareMatches(m, newEntry.state.match) == 0),
  );

  const allTeams = $derived.by(() => {
    const teamSet = new Set<string>();

    pageData.compRecord.teams.forEach((t) => teamSet.add(t.number));

    if (newEntry.type == "match") {
      pageData.matches.forEach((m) => {
        [m.red1, m.red2, m.red3, m.blue1, m.blue2, m.blue3, ...(m.extraTeams || [])].forEach((t) => {
          if (t) teamSet.add(t);
        });
      });
    }

    if (matchData && newEntry.type == "match") {
      [
        matchData.red1,
        matchData.red2,
        matchData.red3,
        matchData.blue1,
        matchData.blue2,
        matchData.blue3,
        ...(matchData.extraTeams || []),
      ].forEach((t) => {
        if (t) teamSet.add(t);
      });
    }

    pageData.entryRecords.forEach((e) => {
      if (e.surveyId == newEntry.survey.id) {
        teamSet.add(e.team);
      }
    });

    return [...teamSet]
      .map((team): Team => ({ number: team, name: getTeamName(team, pageData.compRecord.teams) || "" }))
      .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
  });

  function onconfirm() {
    newEntry.state.team = newEntry.state.team.trim();
    newEntry.state.scout = newEntry.state.scout?.trim();
    if (newEntry.type == "match") {
      newEntry.state.predictionReason = newEntry.state.predictionReason?.trim();
    }

    if (!isValidTeam(newEntry.state.team)) {
      error = "invalid value for team";
      return;
    }

    if (pageData.compRecord.scouts && !newEntry.state.scout) {
      error = "scout name missing";
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
    if (!match) return newEntry.state.team || "";
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
    return newEntry.state.team || "";
  }

  function teamUnderline(teamNumber?: string) {
    return teamNumber == newEntry.state.team ? "underline" : "";
  }

  function teamBold(teamNumber?: string) {
    return teamNumber == newEntry.state.team ? "font-bold" : "font-light";
  }

  function getNewMatchEntryPrefills(entries: MatchEntry[]) {
    const prefills: MatchPrefills = {
      match: { number: 1 },
      team: "",
      scout: localStorage.getItem("scout") || undefined,
    };

    let lastScoutedMatch: MatchIdentifier | undefined = undefined;

    for (const entry of entries) {
      const entryMatchIdentifier: MatchIdentifier = {
        number: entry.match,
        set: entry.matchSet,
        level: entry.matchLevel,
      };

      if (!lastScoutedMatch || compareMatches(lastScoutedMatch, entryMatchIdentifier) < 0) {
        lastScoutedMatch = entryMatchIdentifier;
      }
    }

    const nextMatch = lastScoutedMatch
      ? pageData.matches.find((m) => compareMatches(m, lastScoutedMatch) > 0)
      : undefined;

    if (nextMatch) {
      prefills.match = nextMatch;
    } else {
      const recordedQualMatches = entries
        .filter((entry) => (!entry.matchSet || entry.matchSet == 1) && (!entry.matchLevel || entry.matchLevel == "qm"))
        .map((entry) => entry.match);

      prefills.match = { number: 1 + Math.max(...recordedQualMatches, 0) };
    }

    const matchData = pageData.matches.find((match) => compareMatches(match, prefills.match!) == 0);
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

    if (prefills.match?.number && !prefills.match.level) {
      prefills.match.level = "qm";
    }

    return prefills;
  }

  function getNewPitEntryPrefills(entries: PitEntry[]) {
    const prefills: PitPrefills = {
      team: "",
      scout: localStorage.getItem("scout") || undefined,
    };

    const scoutedTeams = entries.map((e) => e.team).toSorted((a, b) => Number(a) - Number(b));
    const unscoutedTeams = pageData.compRecord.teams
      .filter((t) => !scoutedTeams.includes(t.number))
      .toSorted((a, b) => Number(a.number) - Number(b.number));

    prefills.team = unscoutedTeams[0]?.number || scoutedTeams?.[0] || "";

    return prefills;
  }
</script>

<label class="flex mt-3 flex-col">
  Survey
  <select
    value={newEntry.survey.id}
    onchange={(e) => {
      const newSurveyId = e.currentTarget.value;
      const surveyRecord = pageData.surveyRecords.find((s) => s.id == newSurveyId);
      if (!surveyRecord || newSurveyId == newEntry.survey.id) return;

      if (surveyRecord.type == "match") {
        const entryRecords = pageData.entryRecords.filter((e) => e.surveyId == newSurveyId);
        const prefills = getNewMatchEntryPrefills(entryRecords as MatchEntry[]);
        newEntry = { type: "match", survey: surveyRecord, prefills, state: structuredClone(prefills) };
      }

      if (surveyRecord.type == "pit") {
        const entryRecords = pageData.entryRecords.filter((e) => e.surveyId == newSurveyId);
        const prefills = getNewPitEntryPrefills(entryRecords as PitEntry[]);
        newEntry = { type: "pit", survey: surveyRecord, prefills, state: structuredClone(prefills) };
      }
    }}
    class="text-theme bg-neutral-800 p-2"
  >
    {#each pageData.surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as surveyRecord (surveyRecord.id)}
      <option value={surveyRecord.id}>{surveyRecord.name}</option>
    {/each}
  </select>
</label>

{#if pageData.compRecord.scouts}
  <div class="flex flex-col">
    Your name
    <Button
      onclick={() => {
        openDialog(SelectScoutDialog, {
          scouts: suggestedScouts,
          prefilled: newEntry.state.scout || "",
          onselect(scout) {
            newEntry.state.scout = scout;
            localStorage.setItem("scout", scout);
          },
        });
      }}
    >
      {#if newEntry.state.scout}
        <SquarePenIcon class="text-theme" />
        {newEntry.state.scout}
      {:else}
        <PlusIcon class="text-theme" />
        Add
      {/if}
    </Button>
  </div>
{/if}

{#if newEntry.type == "match"}
  <div class="flex flex-wrap gap-x-4 gap-y-3" transition:slide>
    <div class="flex flex-col grow">
      Selected match

      <div class="flex gap-x-4 gap-y-3 grow flex-wrap">
        <Button
          onclick={() => {
            if (newEntry.type != "match") return;
            openDialog(SelectMatchDialog, {
              matches: pageData.matches,
              lastCompletedMatch: pageData.lastCompletedMatch,
              prefilled: newEntry.state.match,
              onselect(match) {
                if (newEntry.type != "match") return;
                newEntry.state.match = $state.snapshot({ ...match, level: match.level || "qm" });
                newEntry.state.team = selectTargetTeamFromMatch(newEntry.state.match);
                closeDialog();
              },
            });
          }}
          class="grow"
        >
          <SquarePenIcon class="text-theme" />
          <div class="flex grow flex-col font-bold">
            {#if newEntry.state.match.level && newEntry.state.match.level != "qm"}
              {newEntry.state.match.level}{newEntry.state.match.set || 1}-{newEntry.state.match.number}
            {:else}
              {newEntry.state.match.number}
            {/if}
          </div>
        </Button>

        <div class="flex gap-2">
          <Button
            disabled={!adjacentMatches.previous && newEntry.state.match.number <= 1}
            onclick={() => {
              if (newEntry.type != "match") return;
              window.clearTimeout(teamMoveAnimReset);
              teamsMoveAnim = { x: -12, opacity: 1 };

              if (
                !adjacentMatches.previous ||
                (newEntry.state.match.set == adjacentMatches.previous.set &&
                  newEntry.state.match.level == adjacentMatches.previous.level)
              ) {
                newEntry.state.match.number--;
              } else {
                newEntry.state.match = structuredClone({
                  ...adjacentMatches.previous,
                  level: adjacentMatches.previous.level || "qm",
                });
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
              if (newEntry.type != "match") return;
              window.clearTimeout(teamMoveAnimReset);
              teamsMoveAnim = { x: 12, opacity: 1 };

              if (
                !adjacentMatches.next ||
                (newEntry.state.match.set == adjacentMatches.next.set &&
                  newEntry.state.match.level == adjacentMatches.next.level)
              ) {
                newEntry.state.match.number++;
              } else {
                newEntry.state.match = structuredClone({
                  ...adjacentMatches.next,
                  level: adjacentMatches.next.level || "qm",
                });
              }

              newEntry.state.team = selectTargetTeamFromMatch(newEntry.state.match);
              teamMoveAnimReset = window.setTimeout(() => (teamsMoveAnim = defaultTeamsMove), 500);
            }}
            class="active:translate-y-0! enabled:active:translate-x-0.5!"
          >
            <ArrowRightIcon class="text-theme" />
          </Button>

          <Anchor route={matchUrl(newEntry.state.match, pageData.compRecord.id)} class="ml-2">
            <ChartBarBigIcon class="text-theme" />
            <span class="hidden sm:block text-sm">Data</span>
          </Anchor>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if matchData && newEntry.type == "match"}
  {#snippet teamMatchButton(team: string, target?: Target, color = "", order = "")}
    {#if team}
      <Button
        onclick={() => {
          newEntry.state.team = team;
          if (target) $targetStore = target;
        }}
        class="w-full {order}"
      >
        {#if newEntry.state.team == team}
          <CircleCheckBigIcon class="{color} size-5" />
        {:else}
          <CircleIcon class="{color} size-5" />
        {/if}
        <div class="flex flex-col truncate {teamBold(team)}">
          <span class="{color} {teamUnderline(team)}">{team}</span>
          <span class="truncate text-xs">{getTeamName(team, pageData.compRecord.teams)}</span>
        </div>
      </Button>
    {/if}
  {/snippet}

  <div class="flex flex-col" transition:slide>
    {#key matchData}
      {@const { red1, red2, red3, blue1, blue2, blue3 } = matchData}

      <div class="flex flex-col" in:fly={teamsMoveAnim}>
        <span class="text-sm font-light">Teams playing</span>

        {#if red1 || red2 || red3 || blue1 || blue2 || blue3}
          <div class="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
            {@render teamMatchButton(red1, "red 1", "text-red", "max-sm:order-1")}
            {@render teamMatchButton(red2, "red 2", "text-red", "max-sm:order-3")}
            {@render teamMatchButton(red3, "red 3", "text-red", "max-sm:order-5")}
            {@render teamMatchButton(blue1, "blue 1", "text-blue", "max-sm:order-2")}
            {@render teamMatchButton(blue2, "blue 2", "text-blue", "max-sm:order-4")}
            {@render teamMatchButton(blue3, "blue 3", "text-blue", "max-sm:order-6")}
          </div>
        {/if}

        {#if matchData.extraTeams?.length}
          <span class="mt-4 text-sm font-light">Other teams</span>
          <div class="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
            {#each matchData.extraTeams || [] as extraTeam}
              {@render teamMatchButton(extraTeam)}
            {/each}
          </div>
        {/if}
      </div>
    {/key}
  </div>
{/if}

<div class="flex flex-col">
  Selected team
  <Button
    onclick={() => {
      openDialog(SelectTeamDialog, {
        teams: allTeams,
        prefilled: newEntry.state.team,
        onselect(team) {
          newEntry.state.team = team;
        },
      });
    }}
  >
    <SquarePenIcon class="text-theme" />
    <div class="flex grow flex-col truncate">
      {#if newEntry.state.team}
        <span class="font-bold">{newEntry.state.team}</span>
        <span class="text-xs font-light truncate">{getTeamName(newEntry.state.team, allTeams)}</span>
      {:else}
        Select
      {/if}
    </div>
  </Button>
</div>

{#if newEntry.type == "match" && pageData.compRecord.scouts}
  <div class="flex flex-col" transition:slide>
    <span>Your guess</span>
    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => {
          if (newEntry.type != "match") return;
          newEntry.state.prediction = newEntry.state.prediction == "red" ? undefined : "red";
        }}
        class={[
          "text-red grow basis-[150px]",
          newEntry.state.prediction == "red" ? "font-bold uppercase" : "font-light",
        ]}
      >
        {#if newEntry.state.prediction == "red"}
          <SquareCheckBigIcon />
        {:else}
          <SquareIcon />
        {/if}
        Red wins
      </Button>
      <Button
        onclick={() => {
          if (newEntry.type != "match") return;
          newEntry.state.prediction = newEntry.state.prediction == "blue" ? undefined : "blue";
        }}
        class={[
          "text-blue grow basis-[150px]",
          newEntry.state.prediction == "blue" ? "font-bold uppercase" : "font-light",
        ]}
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
              {getTeamName(entry.team, pageData.compRecord.teams) || "Team"}
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

<Button onclick={onconfirm} class="mt-2 self-start font-bold">
  <PlusIcon class="text-theme" />
  Create
</Button>
