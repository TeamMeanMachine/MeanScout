<script lang="ts">
  import { calculateTeamData, normalizeTeamData, getTeamColor, type PickList } from "$lib/analysis";
  import type { MatchEntry } from "$lib/entry";
  import type { DetailedSingleField } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import { onDestroy, onMount } from "svelte";
  import { flip } from "svelte/animate";
  import { linear } from "svelte/easing";
  import { Tween } from "svelte/motion";

  let {
    surveyRecord,
    fields,
    entriesByTeam,
    pickList,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    fields: DetailedSingleField[];
    entriesByTeam: Record<string, IDBRecord<MatchEntry>[]>;
    pickList: PickList;
  } = $props();

  const changeDuration = 700;
  const updateDuration = changeDuration + 500;

  const initData = generateRaceData(1).map(({ team, color, percentage }) => {
    return { team, color, percentage: new Tween(percentage, { delay: 0, easing: linear, duration: changeDuration }) };
  });

  let match = $state(1);
  let matchData = $derived.by(() => {
    const possibleMatch = surveyRecord.matches.find((m) => m.number == match);
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
    const pickListData: Record<string, number> = {};

    for (const team in entriesByTeam) {
      subsetEntriesByTeam[team] = entriesByTeam[team].filter((entry) => entry.match <= toMatch);
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, surveyRecord.expressions, subsetEntriesByTeam, fields);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team] += normalizedTeamData[team];
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);

    return Object.keys(normalizedPickListData)
      .map((team) => ({ team, percentage: normalizedPickListData[team], color: getTeamColor(team) }))
      .toSorted((a, b) => b.percentage - a.percentage);
  }

  onMount(() => {
    interval = setInterval(() => {
      if (match >= Math.max(...surveyRecord.matches.map((m) => m.number))) {
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
    max={Math.max(...surveyRecord.matches.map((m) => m.number))}
    bind:value={match}
    oninput={() => clearInterval(interval)}
    onchange={update}
    class="accent-theme"
  />
</div>

{#each data as { team, percentage, color } (team)}
  <div
    animate:flip={{ duration: changeDuration, delay: 0, easing: linear }}
    class="pr-1"
    style="width:{percentage.current.toFixed(2)}%"
  >
    <div class="flex justify-between gap-3">
      {#if matchData?.includes(team)}
        <strong class="underline">{team}</strong>
      {:else}
        <span>{team}</span>
      {/if}
      {percentage.current.toFixed(1)}%
    </div>
    <div style="background-color:{color};height:6px"></div>
  </div>
{/each}
