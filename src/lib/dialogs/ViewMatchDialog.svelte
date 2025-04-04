<script lang="ts">
  import { getMatchTeamFontWeight, sessionStorageStore, type Match } from "$lib";
  import { calculateTeamData, normalizeTeamData } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import { getMatchEntriesByTeam } from "$lib/entry";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import ViewTeamDialog from "./ViewTeamDialog.svelte";

  let {
    data,
    match,
  }: {
    data: PageData;
    match: Match;
  } = $props();

  const tab = sessionStorageStore<"info" | "picklists" | "expressions">(
    "view-match-tab",
    data.surveyType == "match" ? "picklists" : "info",
  );

  const pickList = sessionStorageStore(
    "view-match-picklist",
    data.surveyType == "match" ? data.surveyRecord.pickLists[0]?.name || "" : "",
  );

  const expression = sessionStorageStore(
    "view-match-expression",
    data.surveyType == "match" ? data.surveyRecord.expressions[0]?.name || "" : "",
  );

  const expressions =
    data.surveyType == "match"
      ? {
          entryDerived: data.surveyRecord.expressions.filter(
            (e) => e.scope == "entry" && e.input.from == "expressions",
          ),
          entryTba: data.surveyRecord.expressions.filter((e) => e.scope == "entry" && e.input.from == "tba"),
          entryPrimitive: data.surveyRecord.expressions.filter((e) => e.scope == "entry" && e.input.from == "fields"),
          surveyDerived: data.surveyRecord.expressions.filter(
            (e) => e.scope == "survey" && e.input.from == "expressions",
          ),
          surveyTba: data.surveyRecord.expressions.filter((e) => e.scope == "survey" && e.input.from == "tba"),
          surveyPrimitive: data.surveyRecord.expressions.filter((e) => e.scope == "survey" && e.input.from == "fields"),
        }
      : {
          entryDerived: [],
          entryTba: [],
          entryPrimitive: [],
          surveyDerived: [],
          surveyTba: [],
          surveyPrimitive: [],
        };

  let pickListData = $derived(getPickListData($pickList));
  let expressionData = $derived(getExpressionData($expression));

  function getPickListData(pickListName: string) {
    if (data.surveyType != "match") return;

    const pickList = data.surveyRecord.pickLists.find((pl) => pl.name == pickListName);
    if (!pickList) return;

    const entriesByTeam = getMatchEntriesByTeam(data.entryRecords);
    const pickListData: Record<string, number> = {};

    for (const team in entriesByTeam) {
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(expressionName, data.surveyRecord.expressions, entriesByTeam, data.fields);
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team] += normalizedTeamData[team];
      }
    }

    return normalizeTeamData(pickListData);
  }

  function getExpressionData(expressionName: string) {
    if (data.surveyType != "match") return;

    const entriesByTeam = getMatchEntriesByTeam(data.entryRecords);
    const teamData = calculateTeamData(expressionName, data.surveyRecord.expressions, entriesByTeam, data.fields);
    const values = Object.keys(teamData).map((team) => teamData[team]);

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    return { teamData, maxValue, minValue };
  }

  function tabClass(matching: string) {
    return $tab == matching ? "font-bold" : "font-light";
  }
</script>

<span>Match {match.number}</span>

{#if data.surveyType == "match"}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "info")} class={tabClass("info")}>Info</Button>
    <Button onclick={() => ($tab = "picklists")} class={tabClass("picklists")}>Pick Lists</Button>
    <Button onclick={() => ($tab = "expressions")} class={tabClass("expressions")}>Expressions</Button>
  </div>
{/if}

{#if $tab == "info" || data.surveyType == "pit"}
  <div class="flex flex-col gap-2">
    {#each [match.red1, match.red2, match.red3] as team}
      {@const teamName = data.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      <Button
        onclick={() => {
          openDialog(ViewTeamDialog, { team: { number: team, name: teamName }, data });
        }}
      >
        <div class="flex flex-col">
          {#if teamName}
            <small class="no-underline! {getMatchTeamFontWeight(team)}">{teamName}</small>
          {/if}
          <span class="text-red {getMatchTeamFontWeight(team)}">{team}</span>
        </div>
      </Button>
    {/each}
    {#each [match.blue1, match.blue2, match.blue3] as team}
      {@const teamName = data.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      <Button
        onclick={() => {
          openDialog(ViewTeamDialog, { team: { number: team, name: teamName }, data });
        }}
      >
        <div class="flex flex-col">
          {#if teamName}
            <small class="no-underline! {getMatchTeamFontWeight(team)}">{teamName}</small>
          {/if}
          <span class="text-blue {getMatchTeamFontWeight(team)}">{team}</span>
        </div>
      </Button>
    {/each}
  </div>
{:else if $tab == "picklists"}
  <select bind:value={$pickList} class="text-theme bg-neutral-800 p-2 text-sm">
    {#each data.surveyRecord.pickLists as pickList}
      <option>{pickList.name}</option>
    {/each}
  </select>

  <div class="flex flex-col gap-4">
    {#each [match.red1, match.red2, match.red3] as team}
      {@const teamName = data.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      {@const percentage = pickListData?.[team] ?? 0}

      <div>
        <div class="flex items-end justify-between gap-3">
          <div class="flex flex-col">
            <strong>{team}</strong>
            {#if teamName}
              <small class="font-light">{teamName}</small>
            {/if}
          </div>
          {percentage.toFixed(1)}%
        </div>
        <div class="bg-neutral-800">
          <div class="bg-red" style="width:{percentage.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    {/each}

    {#each [match.blue1, match.blue2, match.blue3] as team}
      {@const teamName = data.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      {@const percentage = pickListData?.[team] ?? 0}

      <div>
        <div class="flex items-end justify-between gap-3">
          <div class="flex flex-col">
            <strong>{team}</strong>
            {#if teamName}
              <small class="font-light">{teamName}</small>
            {/if}
          </div>
          {percentage.toFixed(1)}%
        </div>
        <div class="bg-neutral-800">
          <div class="bg-blue" style="width:{percentage.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    {/each}
  </div>
{:else if $tab == "expressions"}
  {@const maxValue = expressionData?.maxValue || 0}
  {@const minValue = expressionData?.minValue || 0}

  <select bind:value={$expression} class="text-theme bg-neutral-800 p-2 text-sm">
    {#if expressions.surveyDerived.length}
      <optgroup label="Survey Expressions from expressions">
        {#each expressions.surveyDerived as expression}
          <option>{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.surveyTba.length}
      <optgroup label="Survey Expressions from TBA">
        {#each expressions.surveyTba as expression}
          <option>{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.surveyPrimitive.length}
      <optgroup label="Survey Expressions from fields">
        {#each expressions.surveyPrimitive as expression}
          <option>{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.entryDerived.length}
      <optgroup label="Entry Expressions from expressions">
        {#each expressions.entryDerived as expression}
          <option>{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.entryTba.length}
      <optgroup label="Entry Expressions from TBA">
        {#each expressions.entryTba as expression}
          <option>{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.entryPrimitive.length}
      <optgroup label="Entry Expressions from fields">
        {#each expressions.entryPrimitive as expression}
          <option>{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
  </select>

  <div class="flex flex-col gap-4 pr-1">
    {#each [match.red1, match.red2, match.red3] as team}
      {@const teamName = data.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      {@const value = expressionData?.teamData[team] ?? 0}
      {@const divWidth = Math.abs(((value - Math.min(minValue, 0)) / (maxValue || minValue || value || 1)) * 100)}

      <div>
        <div class="flex items-end justify-between gap-3">
          <div class="flex flex-col">
            <strong>{team}</strong>
            {#if teamName}
              <small class="font-light">{teamName}</small>
            {/if}
          </div>
          {value.toFixed(2)}
        </div>
        <div class="bg-neutral-800">
          <div class="bg-red" style="width:{divWidth.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    {/each}

    {#each [match.blue1, match.blue2, match.blue3] as team}
      {@const teamName = data.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      {@const value = expressionData?.teamData[team] ?? 0}
      {@const divWidth = Math.abs(((value - Math.min(minValue, 0)) / (maxValue || minValue || value || 1)) * 100)}

      <div>
        <div class="flex items-end justify-between gap-3">
          <div class="flex flex-col">
            <strong>{team}</strong>
            {#if teamName}
              <small class="font-light">{teamName}</small>
            {/if}
          </div>
          {value.toFixed(2)}
        </div>
        <div class="bg-neutral-800">
          <div class="bg-blue" style="width:{divWidth.toFixed(2)}%;height:6px"></div>
        </div>
      </div>
    {/each}
  </div>
{/if}
