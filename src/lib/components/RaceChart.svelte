<script lang="ts">
  import { getExpressionData, getFieldData, getPickListData, type RankData } from "$lib/rank";
  import type { MatchEntry } from "$lib/entry";
  import { onDestroy, onMount } from "svelte";
  import { flip } from "svelte/animate";
  import { linear } from "svelte/easing";
  import { Tween } from "svelte/motion";
  import Button from "./Button.svelte";
  import { getOrdinal, sessionStorageStore } from "$lib";
  import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from "@lucide/svelte";
  import type { MatchSurvey } from "$lib/survey";
  import type { CompPageData } from "$lib/comp";
  import { getFieldsWithDetails } from "$lib/field";
  import Anchor from "./Anchor.svelte";

  let {
    pageData,
    surveyRecord,
    entriesByTeam,
    rankData,
  }: {
    pageData: CompPageData;
    surveyRecord: MatchSurvey;
    entriesByTeam: Record<string, MatchEntry[]>;
    rankData: RankData;
  } = $props();

  const fieldRecords = pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id);
  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  const highlightedTeam = sessionStorageStore<string>("team-highlight", "");
  const playing = sessionStorageStore<"" | "true">("race-chart-playing", "");

  const changeDuration = 700;
  const updateDuration = changeDuration + 500;
  const tweenOptions = { delay: 0, easing: linear, duration: changeDuration };
  const maxMatch = Math.max(...pageData.entryRecords.map((e) => (e.type == "match" ? e.match : 0)));

  const initMatch = getInitMatch();

  const initRankData = generateRaceRankData(initMatch).teams.map((teamRank) => {
    if ("value" in teamRank) {
      return {
        ...teamRank,
        percentage: new Tween(teamRank.percentage, tweenOptions),
        value: new Tween(teamRank.value, tweenOptions),
      };
    } else {
      return {
        ...teamRank,
        percentage: new Tween(teamRank.percentage, tweenOptions),
      };
    }
  });

  let match = $state(initMatch);
  let currentRankData = $state(initRankData);
  let interval = $state<NodeJS.Timeout>();

  let matchTeams = $derived.by(() => {
    const possibleMatch = pageData.compRecord.matches.find((m) => m.number == match);
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

  function generateRaceRankData(toMatch: number) {
    const subsetEntriesByTeam: Record<string, MatchEntry[]> = {};

    for (const team in entriesByTeam) {
      subsetEntriesByTeam[team] = entriesByTeam[team].filter((entry) => entry.match <= toMatch);
    }

    let newRankData =
      rankData.type == "picklist"
        ? getPickListData(
            pageData.compRecord,
            rankData.pickList,
            surveyRecord,
            subsetEntriesByTeam,
            fieldsWithDetails.orderedSingle,
          )
        : rankData.type == "expression"
          ? getExpressionData(
              pageData.compRecord,
              rankData.expression,
              surveyRecord,
              subsetEntriesByTeam,
              fieldsWithDetails.orderedSingle,
            )
          : getFieldData(
              pageData.compRecord,
              rankData.field,
              surveyRecord,
              subsetEntriesByTeam,
              fieldsWithDetails.orderedSingle,
            );

    if (!newRankData) {
      throw new Error("AAAAA");
    }

    return newRankData;
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
    const newRankData = generateRaceRankData(match);

    if (newRankData.type != "picklist") {
      currentRankData = currentRankData.map((teamRank) => {
        const newPercentage = newRankData.teams.find((d) => d.team == teamRank.team)?.percentage;
        if (newPercentage !== undefined) {
          teamRank.percentage.target = newPercentage;
        }

        if (!("value" in teamRank)) {
          return teamRank;
        }

        const newValue = newRankData.teams.find((d) => d.team == teamRank.team)?.value;
        if (newValue !== undefined) {
          teamRank.value.target = newValue;
        }

        return teamRank;
      });
    } else {
      currentRankData = currentRankData.map((teamRank) => {
        const newPercentage = newRankData.teams.find((d) => d.team == teamRank.team)?.percentage;
        if (newPercentage !== undefined) {
          teamRank.percentage.target = newPercentage;
        }
        return teamRank;
      });
    }

    currentRankData.sort((a, b) => b.percentage.target - a.percentage.target);
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
      class="active:translate-y-0! enabled:active:-translate-x-0.5!"
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
      class="active:translate-y-0! enabled:active:translate-x-0.5!"
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
  {#each currentRankData as teamRank (teamRank.team)}
    {@const color = `rgb(var(--theme-color) / ${teamRank.percentage.current.toFixed(2)}%)`}

    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      onclick={() => ($highlightedTeam = $highlightedTeam == teamRank.team ? "" : teamRank.team)}
      animate:flip={{ duration: changeDuration, delay: 0, easing: linear }}
      class="col-span-full grid grid-cols-subgrid"
    >
      <Anchor route="comp/{pageData.compRecord.id}/team/{teamRank.team}" class="justify-center text-sm">
        <div class="flex items-baseline">
          <span class="font-bold">{teamRank.rank}</span>
          <span class="hidden text-xs font-light sm:inline">{getOrdinal(teamRank.rank)}</span>
        </div>
      </Anchor>

      <div>
        <div
          class={[
            "flex items-end justify-between gap-3",
            $highlightedTeam == teamRank.team && "border-x-[6px] border-neutral-400 bg-neutral-800 px-1",
          ]}
        >
          <div class="flex flex-col">
            <span class="font-bold" class:underline={matchTeams?.includes(teamRank.team)}>{teamRank.team}</span>
            {#if teamRank.teamName}
              <span class={["text-xs", matchTeams?.includes(teamRank.team) ? "font-bold" : "font-light"]}>
                {teamRank.teamName}
              </span>
            {/if}
          </div>
          {#if "value" in teamRank}
            {teamRank.value.current.toFixed(2)}
          {:else}
            <span>{teamRank.percentage.current.toFixed(1)}<span class="text-xs font-light">%</span></span>
          {/if}
        </div>
        <div class={$highlightedTeam == teamRank.team ? "bg-neutral-700" : "bg-neutral-800"}>
          <div style="background-color:{color};width:{teamRank.percentage.current.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    </div>
  {/each}
</div>
