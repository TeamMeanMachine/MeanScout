<script lang="ts">
  import { type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog, type DialogExports } from "$lib/dialog";
  import { type Entry } from "$lib/entry";
  import { getDefaultFieldValue } from "$lib/field";
  import { objectStore } from "$lib/idb";
  import { targetStore } from "$lib/settings";
  import { EyeIcon, MinusIcon, PlusIcon, SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import NewScoutDialog from "./NewScoutDialog.svelte";
  import ViewMatchDialog from "./ViewMatchDialog.svelte";
  import { goto } from "$app/navigation";

  let {
    pageData,
    prefilledMatch,
    prefilledTeam,
    prefilledScout,
    onnewscout,
  }: {
    pageData: PageData;
    prefilledMatch: number;
    prefilledTeam: string;
    prefilledScout: string | undefined;
    onnewscout: (scout: string) => void;
  } = $props();

  let match = $state(prefilledMatch);
  let team = $state(prefilledTeam);

  let scout = $state(prefilledScout);

  let prediction = $state<"red" | "blue" | undefined>();
  let predictionReason = $state<string | undefined>();

  let error = $state("");

  let matchData = $derived(pageData.surveyRecord.matches.find((m) => m.number == match));

  let teamNumberNameMap = new Map<string, string>();
  for (const team of pageData.surveyRecord.teams) {
    teamNumberNameMap.set(team.number, team.name);
  }

  let suggestedTeams = $derived.by(() => {
    match;
    const teamSet = new Set<string>();

    if (matchData && pageData.surveyType == "match") {
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

      for (const team of pageData.surveyRecord.teams) {
        if (
          !pageData.surveyRecord.matches
            .flatMap((match) => [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3])
            .includes(team.number)
        ) {
          teamSet.add(team.number);
        }
      }
    } else {
      for (const team of pageData.surveyRecord.teams) {
        teamSet.add(team.number);
      }
    }

    return [...teamSet]
      .map((team): Team => pageData.surveyRecord.teams.find((t) => t.number == team) || { number: team, name: "" })
      .toSorted((a, b) => parseInt(a.number) - parseInt(b.number));
  });

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      team = team.trim();
      scout = scout?.trim();
      predictionReason = predictionReason?.trim();

      if (!/^\d{1,5}[A-Z]?$/.test(team)) {
        error = "invalid value for team";
        return;
      }

      if (suggestedTeams.length && !suggestedTeams.some((t) => t.number == team)) {
        error = "team is not listed";
        return;
      }

      if (pageData.surveyRecord.scouts && !scout) {
        error = "scout name missing";
        return;
      }

      if (pageData.surveyType == "match" && !/\d{1,3}/.test(`${match}`)) {
        error = "invalid value for match";
        return;
      }

      const defaultValues = pageData.fieldsWithDetails.orderedSingle.map((field) => getDefaultFieldValue(field.field));

      let entry: Entry;
      if (pageData.surveyType == "match") {
        entry = {
          surveyId: pageData.surveyRecord.id,
          type: pageData.surveyRecord.type,
          status: "draft",
          team,
          match,
          absent: false,
          values: defaultValues,
          scout: scout || undefined,
          prediction: prediction || undefined,
          predictionReason: predictionReason || undefined,
          created: new Date(),
          modified: new Date(),
        };
      } else {
        entry = {
          surveyId: pageData.surveyRecord.id,
          type: pageData.surveyRecord.type,
          status: "draft",
          team,
          values: defaultValues,
          scout: scout || undefined,
          created: new Date(),
          modified: new Date(),
        };
      }

      const addRequest = objectStore("entries", "readwrite").add($state.snapshot(entry));
      addRequest.onerror = () => {
        error = "Could not create new entry";
      };

      addRequest.onsuccess = () => {
        const id = addRequest.result;
        if (id == undefined) {
          error = "Could not create new entry";
          return;
        }

        goto(`#/entry/${id}`);
      };
    },
  };

  function teamUnderline(teamNumber?: string) {
    return teamNumber == team ? "underline" : "";
  }

  function teamBold(teamNumber?: string) {
    return teamNumber == team ? "font-bold" : "font-light";
  }
</script>

<h2 class="font-bold">New entry</h2>

{#if pageData.surveyRecord.scouts}
  <div class="flex flex-col">
    Your name
    <div class="flex flex-wrap gap-2">
      {#if pageData.surveyRecord.scouts}
        {#if pageData.surveyRecord.scouts.length}
          <select bind:value={scout} class="text-theme grow bg-neutral-800 p-2">
            {#each pageData.surveyRecord.scouts.toSorted((a, b) => a.localeCompare(b)) as scout}
              <option>{scout}</option>
            {/each}
          </select>
        {/if}
        <Button
          onclick={() => {
            openDialog(NewScoutDialog, {
              scouts: pageData.surveyRecord.scouts ?? [],
              onadd(newScout) {
                pageData = {
                  ...pageData,
                  surveyRecord: {
                    ...pageData.surveyRecord,
                    scouts: [...(pageData.surveyRecord.scouts || []), newScout],
                  },
                } as PageData;
                objectStore("surveys", "readwrite").put($state.snapshot(pageData.surveyRecord));
                scout = newScout;
                onnewscout(newScout);
              },
            });
          }}
          class={pageData.surveyRecord.scouts.length ? "" : "w-full"}
        >
          <PlusIcon class="text-theme" />
          {#if !pageData.surveyRecord.scouts.length}
            New scout
          {/if}
        </Button>
      {/if}
    </div>
  </div>
{/if}

{#if pageData.surveyType == "match"}
  <div class="flex items-end gap-2">
    <label class="flex grow flex-col">
      Match
      <input
        type="number"
        bind:value={match}
        oninput={() => (team = suggestedTeams[0].number)}
        min="1"
        class="text-theme w-full bg-neutral-800 p-2"
      />
    </label>
    <Button disabled={match <= 1} onclick={() => match--}>
      <MinusIcon class="text-theme" />
    </Button>
    <Button onclick={() => match++}>
      <PlusIcon class="text-theme" />
    </Button>
  </div>
{/if}

{#if matchData}
  {@const { red1, red2, red3, blue1, blue2, blue3 } = matchData}

  <div class="flex flex-col">
    <div class="flex items-end justify-between">
      <span>Team</span>
      {#if $targetStore != "pit"}
        <small class="text-theme capitalize">{$targetStore}</small>
      {/if}
    </div>

    <div class="grid grid-cols-3 gap-2">
      <Button
        onclick={() => {
          team = red1;
          $targetStore = "red 1";
        }}
        class="w-full"
      >
        <div class="flex flex-col truncate {teamBold(red1)}">
          <span class="text-red {teamUnderline(red1)}">{red1}</span>
          <small class="truncate">{teamNumberNameMap.get(red1)}</small>
        </div>
      </Button>
      <Button
        onclick={() => {
          team = red2;
          $targetStore = "red 2";
        }}
        class="w-full"
      >
        <div class="flex flex-col truncate {teamBold(red2)}">
          <span class="text-red {teamUnderline(red2)}">{red2}</span>
          <small class="truncate">{teamNumberNameMap.get(red2)}</small>
        </div>
      </Button>
      <Button
        onclick={() => {
          team = red3;
          $targetStore = "red 3";
        }}
        class="w-full"
      >
        <div class="flex flex-col truncate {teamBold(red3)}">
          <span class="text-red {teamUnderline(red3)}">{red3}</span>
          <small class="truncate">{teamNumberNameMap.get(red3)}</small>
        </div>
      </Button>

      <Button
        onclick={() => {
          team = blue1;
          $targetStore = "blue 1";
        }}
        class="w-full"
      >
        <div class="flex flex-col truncate {teamBold(blue1)}">
          <span class="text-blue {teamUnderline(blue1)}">{blue1}</span>
          <small class="truncate">{teamNumberNameMap.get(blue1)}</small>
        </div>
      </Button>
      <Button
        onclick={() => {
          team = blue2;
          $targetStore = "blue 2";
        }}
        class="w-full"
      >
        <div class="flex flex-col truncate {teamBold(blue2)}">
          <span class="text-blue {teamUnderline(blue2)}">{blue2}</span>
          <small class="truncate">{teamNumberNameMap.get(blue2)}</small>
        </div>
      </Button>
      <Button
        onclick={() => {
          team = blue3;
          $targetStore = "blue 3";
        }}
        class="w-full"
      >
        <div class="flex flex-col truncate {teamBold(blue3)}">
          <span class="text-blue {teamUnderline(blue3)}">{blue3}</span>
          <small class="truncate">{teamNumberNameMap.get(blue3)}</small>
        </div>
      </Button>
    </div>
  </div>
{:else if suggestedTeams.length}
  <label class="flex flex-col">
    Team
    <select bind:value={team} class="text-theme bg-neutral-800 p-2">
      {#each suggestedTeams as team}
        <option value={team.number}>{team.number} {team.name}</option>
      {/each}
    </select>
  </label>
{:else}
  <label class="flex flex-col">
    Team
    <input bind:value={team} class="text-theme bg-neutral-800 p-2" />
  </label>
{/if}

{#if pageData.surveyType == "match" && pageData.surveyRecord.scouts}
  <h2 class="mt-4 font-bold">Prediction</h2>

  <Button
    onclick={() => {
      if (!matchData) return;
      openDialog(ViewMatchDialog, { pageData, match: matchData });
    }}
    disabled={!matchData}
  >
    <EyeIcon class="text-theme" />
    <div class="flex flex-col">
      View data
      <small>Info, analysis</small>
    </div>
  </Button>

  <div class="flex flex-col">
    <span>Your prediction</span>
    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => (prediction = prediction == "red" ? undefined : "red")}
        class="text-red grow basis-[150px] {prediction == 'red' ? 'font-bold uppercase' : 'font-light'}"
      >
        {#if prediction == "red"}
          <SquareCheckBigIcon />
        {:else}
          <SquareIcon />
        {/if}
        Red wins
      </Button>
      <Button
        onclick={() => (prediction = prediction == "blue" ? undefined : "blue")}
        class="text-blue grow basis-[150px] {prediction == 'blue' ? 'font-bold uppercase' : 'font-light'}"
      >
        {#if prediction == "blue"}
          <SquareCheckBigIcon />
        {:else}
          <SquareIcon />
        {/if}
        Blue wins
      </Button>
    </div>
  </div>

  <label class="mb-4 flex flex-col">
    Reason
    <input bind:value={predictionReason} class="text-theme bg-neutral-800 p-2" />
  </label>
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
