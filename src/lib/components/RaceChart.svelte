<script lang="ts">
  import { getExpressionData, getPickListData, type AnalysisData } from "$lib/analysis";
  import type { MatchEntry } from "$lib/entry";
  import { onDestroy, onMount } from "svelte";
  import { flip } from "svelte/animate";
  import { linear } from "svelte/easing";
  import { Tween } from "svelte/motion";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import Button from "./Button.svelte";
  import { openDialog } from "$lib/dialog";
  import ViewTeamDialog from "$lib/dialogs/ViewTeamDialog.svelte";
  import { getOrdinal, sessionStorageStore } from "$lib";
  import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from "@lucide/svelte";

  let {
    pageData,
    entriesByTeam,
    analysisData,
  }: {
    pageData: Extract<PageData, { surveyType: "match" }>;
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    analysisData: AnalysisData;
  } = $props();

  const playing = sessionStorageStore<"" | "true">("race-chart-playing", "");

  const changeDuration = 700;
  const updateDuration = changeDuration + 500;
  const tweenOptions = { delay: 0, easing: linear, duration: changeDuration };
  const maxMatch = Math.max(...pageData.entryRecords.map((e) => e.match));

  const initMatch = getInitMatch();

  const initData = generateRaceData(initMatch).data.map((data) => {
    if ("value" in data) {
      return {
        ...data,
        percentage: new Tween(data.percentage, tweenOptions),
        value: new Tween(data.value, tweenOptions),
      };
    } else {
      return {
        ...data,
        percentage: new Tween(data.percentage, tweenOptions),
      };
    }
  });

  let match = $state(initMatch);
  let data = $state(initData);
  let interval = $state<NodeJS.Timeout>();

  let matchData = $derived.by(() => {
    const possibleMatch = pageData.surveyRecord.matches.find((m) => m.number == match);
    if (possibleMatch) {
      return [
        possibleMatch.red1,
        possibleMatch.red2,
        possibleMatch.red3,
        possibleMatch.blue1,
        possibleMatch.blue2,
        possibleMatch.blue3,
      ];
    }
  });

  $effect(() => {
    sessionStorage.setItem("race-chart-match", match.toString());
  });

  function getInitMatch() {
    const value = Number(sessionStorage.getItem("race-chart-match"));
    if (!Number.isNaN(value)) {
      return Math.max(Math.min(value, maxMatch), 1);
    }
    return 1;
  }

  function generateRaceData(toMatch: number) {
    const subsetEntriesByTeam: Record<string, IDBRecord<MatchEntry>[]> = {};

    for (const team in entriesByTeam) {
      subsetEntriesByTeam[team] = entriesByTeam[team].filter((entry) => entry.match <= toMatch);
    }

    let data =
      analysisData.type == "picklist"
        ? getPickListData(
            analysisData.pickList.name,
            pageData.surveyRecord,
            subsetEntriesByTeam,
            pageData.fieldsWithDetails.orderedSingle,
          )
        : getExpressionData(
            analysisData.expression.name,
            pageData.surveyRecord,
            subsetEntriesByTeam,
            pageData.fieldsWithDetails.orderedSingle,
          );

    if (!data) {
      throw new Error("AAAAA");
    }

    return data;
  }

  onMount(() => {
    if ($playing) start();
  });

  function start() {
    interval = setInterval(() => {
      if (match >= maxMatch) {
        $playing = "";
        clearTimeout(interval);
      } else {
        match++;
        update();
      }
    }, updateDuration);
  }

  function update() {
    const newData = generateRaceData(match);

    if (newData.type == "expression") {
      data = data.map((team) => {
        const newPercentage = newData.data.find((d) => d.team == team.team)?.percentage;
        if (newPercentage !== undefined) {
          team.percentage.target = newPercentage;
        }

        if (!("value" in team)) {
          return team;
        }

        const newValue = newData.data.find((d) => d.team == team.team)?.value;
        if (newValue !== undefined) {
          team.value.target = newValue;
        }

        return team;
      });
    } else {
      data = data.map((team) => {
        const newPercentage = newData.data.find((d) => d.team == team.team)?.percentage;
        if (newPercentage !== undefined) {
          team.percentage.target = newPercentage;
        }
        return team;
      });
    }

    data.sort((a, b) => b.percentage.target - a.percentage.target);
  }

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<div class="flex flex-wrap gap-2">
  <div class="flex flex-wrap gap-2">
    <Button
      onclick={() => {
        if ($playing) {
          $playing = "";
          clearInterval(interval);
        } else {
          if (match >= maxMatch) {
            match = 1;
            update();
          }
          $playing = "true";
          start();
        }
      }}
    >
      {#if $playing}
        <PauseIcon class="text-theme" />
      {:else}
        <PlayIcon class="text-theme" />
      {/if}
    </Button>
    <Button
      onclick={() => {
        $playing = "";
        clearInterval(interval);
        match--;
        update();
      }}
      disabled={match <= 1}
    >
      <ArrowLeftIcon class="text-theme" />
    </Button>
    <Button
      onclick={() => {
        $playing = "";
        clearInterval(interval);
        match++;
        update();
      }}
      disabled={match >= maxMatch}
    >
      <ArrowRightIcon class="text-theme" />
    </Button>
  </div>

  <div class="flex grow basis-80 flex-col">
    <span>Match {match}</span>

    <input
      type="range"
      min="1"
      max={maxMatch}
      bind:value={match}
      oninput={() => {
        $playing = "";
        clearInterval(interval);
      }}
      onchange={update}
      class="accent-theme"
    />
  </div>
</div>

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each data as teamData, rank (teamData.team)}
    {@const color = `rgb(var(--theme-color) / ${teamData.percentage.current.toFixed(2)}%)`}

    <div
      animate:flip={{ duration: changeDuration, delay: 0, easing: linear }}
      class="col-span-full grid grid-cols-subgrid"
    >
      <Button
        onclick={() => {
          openDialog(ViewTeamDialog, { pageData, team: { number: teamData.team, name: teamData.teamName } });
        }}
        class="justify-center text-sm"
      >
        <div>
          <span class="font-bold">{rank + 1}</span><span class="hidden text-xs sm:inline">{getOrdinal(rank + 1)}</span>
        </div>
      </Button>

      <div>
        <div class="flex items-end justify-between gap-3">
          <div class="flex flex-col">
            <strong class:underline={matchData?.includes(teamData.team)}>{teamData.team}</strong>
            {#if teamData.teamName}
              <small class={matchData?.includes(teamData.team) ? "font-bold" : "font-light"}>{teamData.teamName}</small>
            {/if}
          </div>
          {#if "value" in teamData}
            {teamData.value.current.toFixed(2)}
          {:else}
            <span>{teamData.percentage.current.toFixed(1)}<span class="text-sm">%</span></span>
          {/if}
        </div>
        <div class="bg-neutral-800">
          <div style="background-color:{color};width:{teamData.percentage.current.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    </div>
  {/each}
</div>
