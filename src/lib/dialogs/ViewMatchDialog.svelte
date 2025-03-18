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

  const surveyExpressions =
    data.surveyType == "match" ? data.surveyRecord.expressions.filter((e) => e.scope == "survey") : [];

  const entryExpressions =
    data.surveyType == "match" ? data.surveyRecord.expressions.filter((e) => e.scope == "entry") : [];

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
      {@const percentage = pickListData?.[team] ?? 0}
      <div class="pr-1" style="width:{percentage.toFixed(2)}%">
        <div class="flex justify-between gap-3">
          <span>{team}</span>
          {percentage.toFixed(1)}%
        </div>
        <div class="bg-red" style="height:6px"></div>
      </div>
    {/each}
    {#each [match.blue1, match.blue2, match.blue3] as team}
      {@const percentage = pickListData?.[team] ?? 0}
      <div class="pr-1" style="width:{percentage.toFixed(2)}%">
        <div class="flex justify-between gap-3">
          <span>{team}</span>
          {percentage.toFixed(1)}%
        </div>
        <div class="bg-blue" style="height:6px"></div>
      </div>
    {/each}
  </div>
{:else if $tab == "expressions"}
  {@const maxValue = expressionData?.maxValue || 0}
  {@const minValue = expressionData?.minValue || 0}

  <select bind:value={$expression} class="text-theme bg-neutral-800 p-2 text-sm">
    <optgroup label="Survey Expressions">
      {#each surveyExpressions as expression}
        <option>{expression.name}</option>
      {/each}
    </optgroup>
    <optgroup label="Entry Expressions">
      {#each entryExpressions as expression}
        <option>{expression.name}</option>
      {/each}
    </optgroup>
  </select>

  <div class="flex flex-col gap-4">
    {#each [match.red1, match.red2, match.red3] as team}
      {@const value = expressionData?.teamData[team] ?? 0}
      {@const divWidth = Math.abs(((value - Math.min(minValue, 0)) / (maxValue || minValue || value || 1)) * 100)}
      <div class="pr-1" style="width:{divWidth.toFixed(2)}%">
        <div class="flex justify-between gap-3">
          <span>{team}</span>
          {value.toFixed(2)}
        </div>
        <div class="bg-red" style="height:6px"></div>
      </div>
    {/each}
    {#each [match.blue1, match.blue2, match.blue3] as team}
      {@const value = expressionData?.teamData[team] ?? 0}
      {@const divWidth = Math.abs(((value - Math.min(minValue, 0)) / (maxValue || minValue || value || 1)) * 100)}
      <div class="pr-1" style="width:{divWidth.toFixed(2)}%">
        <div class="flex justify-between gap-3">
          <span>{team}</span>
          {value.toFixed(2)}
        </div>
        <div class="bg-blue" style="height:6px"></div>
      </div>
    {/each}
  </div>
{/if}
