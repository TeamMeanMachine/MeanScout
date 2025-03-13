<script lang="ts">
  import { type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog, type DialogExports } from "$lib/dialog";
  import { type Entry } from "$lib/entry";
  import { getDefaultFieldValue } from "$lib/field";
  import { objectStore } from "$lib/idb";
  import { targetStore } from "$lib/settings";
  import { PlusIcon, SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import NewScoutDialog from "./NewScoutDialog.svelte";
  import ViewMatchDialog from "./ViewMatchDialog.svelte";

  let {
    data,
    prefilledMatch,
    prefilledTeam,
    prefilledScout,
    onnewscout,
  }: {
    data: PageData;
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

  let suggestedTeams = $derived(getSuggestedTeams(match));
  let teamName = $derived(data.surveyRecord.teams.find((t) => t.number == team)?.name || "");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      team = team.trim();
      scout = scout?.trim();
      predictionReason = predictionReason?.trim();

      const teamHasInvalidFormat = !/^\d{1,5}[A-Z]?$/.test(team);
      const teamIsNotListed = suggestedTeams.length && !suggestedTeams.some((t) => t.number == team);

      if (teamHasInvalidFormat) {
        error = "invalid value for team";
        return;
      }

      if (teamIsNotListed) {
        error = "team is not listed";
        return;
      }

      if (data.surveyRecord.scouts && !scout) {
        error = "scout name missing";
        return;
      }

      if (data.surveyType == "match") {
        if (!/\d{1,3}/.test(`${match}`)) {
          error = "invalid value for match";
          return;
        }

        if (data.surveyRecord.matches.length && !data.surveyRecord.matches.some((m) => m.number == match)) {
          error = "match is not listed";
          return;
        }
      }

      const defaultValues = data.fields.map((field) => getDefaultFieldValue(field.field));

      let entry: Entry;
      if (data.surveyType == "match") {
        entry = {
          surveyId: data.surveyRecord.id,
          type: data.surveyRecord.type,
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
          surveyId: data.surveyRecord.id,
          type: data.surveyRecord.type,
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

        location.hash = `/entry/${id}`;
      };
    },
  };

  function getSuggestedTeams(matchValue: number) {
    const teamSet = new Set<string>();

    if (data.surveyType == "match") {
      const matchData = data.surveyRecord.matches.find((match) => match.number == matchValue);

      if (matchData) {
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
          default:
            teamSet.add(matchData.red1);
            teamSet.add(matchData.red2);
            teamSet.add(matchData.red3);
            teamSet.add(matchData.blue1);
            teamSet.add(matchData.blue2);
            teamSet.add(matchData.blue3);
        }
      }

      data.surveyRecord.teams.forEach((team) => {
        if (
          data.surveyType == "match" &&
          !data.surveyRecord.matches
            .flatMap((match) => [match.red1, match.red2, match.red3, match.blue1, match.blue2, match.blue3])
            .includes(team.number)
        ) {
          teamSet.add(team.number);
        }
      });
    } else {
      data.surveyRecord.teams.forEach((team) => {
        teamSet.add(team.number);
      });
    }

    return [...teamSet]
      .map((team): Team => data.surveyRecord.teams.find((t) => t.number == team) || { number: team, name: "" })
      .toSorted((a, b) => parseInt(a.number) - parseInt(b.number));
  }

  function matchTeamWeight(teamNumber?: string) {
    return teamNumber == team ? "font-bold underline" : "font-light";
  }
</script>

<h2 class="font-bold">New entry</h2>

{#if data.surveyRecord.scouts}
  <div class="flex flex-col">
    Your name
    <div class="flex flex-wrap gap-2">
      {#if data.surveyRecord.scouts}
        {#if data.surveyRecord.scouts.length}
          <select bind:value={scout} class="text-theme grow bg-neutral-800 p-2">
            {#each data.surveyRecord.scouts.toSorted((a, b) => a.localeCompare(b)) as scout}
              <option>{scout}</option>
            {/each}
          </select>
        {/if}
        <Button
          onclick={() => {
            openDialog(NewScoutDialog, {
              scouts: data.surveyRecord.scouts ?? [],
              onadd(newScout) {
                data = {
                  ...data,
                  surveyRecord: { ...data.surveyRecord, scouts: [...(data.surveyRecord.scouts || []), newScout] },
                } as PageData;
                objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
                scout = newScout;
                onnewscout(newScout);
              },
            });
          }}
          class={data.surveyRecord.scouts.length ? "" : "w-full"}
        >
          <PlusIcon class="text-theme" />
          {#if !data.surveyRecord.scouts.length}
            New scout
          {/if}
        </Button>
      {/if}
    </div>
  </div>
{/if}

{#if data.surveyType == "match"}
  <label class="flex flex-col">
    Match
    <input
      type="number"
      bind:value={match}
      oninput={() => (team = suggestedTeams[0].number)}
      min="1"
      class="text-theme bg-neutral-800 p-2"
    />
  </label>
{/if}

<datalist id="teams-list">
  {#each suggestedTeams as team}
    <option value={team.number}>{team.name}</option>
  {/each}
</datalist>
<label class="flex flex-col">
  <div class="flex flex-wrap items-end justify-between">
    Team
    {#if teamName}
      <span class="text-sm font-light">{teamName}</span>
    {/if}
  </div>
  <input list="teams-list" bind:value={team} class="text-theme bg-neutral-800 p-2" />
</label>

{#if data.surveyType == "match" && data.surveyRecord.scouts}
  {@const matchData = data.surveyRecord.matches.find((m) => m.number == match)}

  <h2 class="mt-4 font-bold">Prediction</h2>

  <Button
    onclick={() => {
      if (!matchData) return;
      openDialog(ViewMatchDialog, {
        data,
        match: matchData,
      });
    }}
    disabled={!matchData}
    class="grid grid-cols-[repeat(4,min-content)_auto] gap-2 gap-x-3 text-center!"
  >
    <div>{match}</div>
    <div class="col-span-3 grid grid-cols-subgrid gap-x-3">
      <div class="text-red {matchTeamWeight(matchData?.red1)}">{matchData?.red1 || "-"}</div>
      <div class="text-red {matchTeamWeight(matchData?.red2)}">{matchData?.red2 || "-"}</div>
      <div class="text-red {matchTeamWeight(matchData?.red3)}">{matchData?.red3 || "-"}</div>
      <div class="text-blue {matchTeamWeight(matchData?.blue1)}">{matchData?.blue1 || "-"}</div>
      <div class="text-blue {matchTeamWeight(matchData?.blue2)}">{matchData?.blue2 || "-"}</div>
      <div class="text-blue {matchTeamWeight(matchData?.blue3)}">{matchData?.blue3 || "-"}</div>
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
