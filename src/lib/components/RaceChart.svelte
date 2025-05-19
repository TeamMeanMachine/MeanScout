<script lang="ts">
  import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
  import type { MatchEntry } from "$lib/entry";
  import { onDestroy, onMount } from "svelte";
  import { flip } from "svelte/animate";
  import { linear } from "svelte/easing";
  import { Tween } from "svelte/motion";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";

  let {
    pageData,
    entriesByTeam,
    pickList,
  }: {
    pageData: Extract<PageData, { surveyType: "match" }>;
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    pickList: PickList;
  } = $props();

  const changeDuration = 700;
  const updateDuration = changeDuration + 500;

  const initData = generateRaceData(1).map((data) => {
    return {
      ...data,
      percentage: new Tween(data.percentage, { delay: 0, easing: linear, duration: changeDuration }),
    };
  });

  let match = $state(1);
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
  let data = $state(initData);
  let interval = $state<NodeJS.Timeout>();

  function generateRaceData(toMatch: number) {
    const subsetEntriesByTeam: Record<string, IDBRecord<MatchEntry>[]> = {};
    const pickListData: Record<string, { value: number }> = {};

    for (const team in entriesByTeam) {
      subsetEntriesByTeam[team] = entriesByTeam[team].filter((entry) => entry.match <= toMatch);
      pickListData[team] = { value: 0 };
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(
        expressionName,
        pageData.surveyRecord.expressions,
        subsetEntriesByTeam,
        pageData.fieldsWithDetails.orderedSingle,
      );
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team].value += normalizedTeamData[team];
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);

    return Object.keys(normalizedPickListData)
      .map((team) => ({
        team,
        teamName: pageData.surveyRecord.teams.find((t) => t.number == team)?.name || "",
        percentage: normalizedPickListData[team],
      }))
      .toSorted((a, b) => b.percentage - a.percentage);
  }

  onMount(() => {
    interval = setInterval(() => {
      if (match >= Math.max(...pageData.surveyRecord.matches.map((m) => m.number))) {
        clearTimeout(interval);
      } else {
        match++;
        update();
      }
    }, updateDuration);
  });

  function update() {
    const newData = generateRaceData(match);
    data = data
      .map((team) => {
        const newPercentage = newData.find((d) => d.team == team.team)?.percentage;
        if (newPercentage !== undefined) {
          team.percentage.target = newPercentage;
        }
        return team;
      })
      .toSorted((a, b) => b.percentage.target - a.percentage.target);
  }

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<div class="flex flex-col">
  <span>Match {match}</span>

  <input
    type="range"
    min="1"
    max={Math.max(...pageData.surveyRecord.matches.map((m) => m.number))}
    bind:value={match}
    oninput={() => clearInterval(interval)}
    onchange={update}
    class="accent-theme"
  />
</div>

<div class="grid gap-x-1 gap-y-4" style="grid-template-columns:min-content auto">
  {#each data as { team, teamName, percentage }, i (team)}
    {@const color = `rgb(var(--theme-color) / ${percentage.current.toFixed(2)}%)`}

    <div
      animate:flip={{ duration: changeDuration, delay: 0, easing: linear }}
      class="col-span-full grid grid-cols-subgrid"
    >
      <div class="flex flex-col justify-center pr-2 text-center text-sm font-bold">{i + 1}</div>
      <div>
        <div class="flex items-end justify-between gap-3">
          <div class="flex flex-col">
            <strong class:underline={matchData?.includes(team)}>{team}</strong>
            {#if teamName}
              <small class={matchData?.includes(team) ? "font-bold" : "font-light"}>{teamName}</small>
            {/if}
          </div>
          {percentage.current.toFixed(1)}%
        </div>
        <div class="bg-neutral-800">
          <div style="background-color:{color};width:{percentage.current.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    </div>
  {/each}
</div>
