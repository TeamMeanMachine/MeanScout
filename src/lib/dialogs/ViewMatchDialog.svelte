<script lang="ts">
  import { getMatchTeamFontWeight, sessionStorageStore, type Match } from "$lib";
  import { getExpressionData, getPickListData, type AnalysisData } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import { getMatchEntriesByTeam, type MatchEntry } from "$lib/entry";
  import { sortExpressions } from "$lib/expression";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import ViewTeamDialog from "./ViewTeamDialog.svelte";

  let {
    pageData,
    match,
  }: {
    pageData: PageData;
    match: Match;
  } = $props();

  const entriesByTeam = getMatchEntriesByTeam(pageData.entryRecords as IDBRecord<MatchEntry>[]);

  const tab = sessionStorageStore<"info" | "picklists" | "expressions">("view-match-tab", "info");

  const sortedExpressions =
    pageData.surveyType == "match" ? pageData.surveyRecord.expressions.toSorted(sortExpressions) : [];

  const pickListName = sessionStorageStore(
    "analysis-picklist",
    pageData.surveyType == "match" ? pageData.surveyRecord.pickLists[0]?.name || "" : "",
  );

  const expressionName = sessionStorageStore(
    "analysis-expression",
    pageData.surveyType == "match" ? sortedExpressions[0]?.name || "" : "",
  );

  if (pageData.surveyType == "match") {
    pickListName.subscribe((val) => {
      if (pageData.surveyRecord.pickLists.every((pl) => pl.name != val)) {
        pickListName.set(pageData.surveyRecord.pickLists[0]?.name || "");
      }
    });

    expressionName.subscribe((val) => {
      if (pageData.surveyRecord.expressions.every((e) => e.name != val)) {
        expressionName.set(sortedExpressions[0]?.name || "");
      }
    });
  }

  const expressions =
    pageData.surveyType == "match"
      ? {
          entryDerived: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "expressions"),
          entryTba: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "tba"),
          entryPrimitive: sortedExpressions.filter((e) => e.scope == "entry" && e.input.from == "fields"),
          surveyDerived: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "expressions"),
          surveyTba: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "tba"),
          surveyPrimitive: sortedExpressions.filter((e) => e.scope == "survey" && e.input.from == "fields"),
        }
      : {
          entryDerived: [],
          entryTba: [],
          entryPrimitive: [],
          surveyDerived: [],
          surveyTba: [],
          surveyPrimitive: [],
        };

  let analysisData = $derived.by<AnalysisData | undefined>(() => {
    if (pageData.surveyType != "match") return;
    if ($tab == "picklists") {
      return getPickListData(
        $pickListName,
        pageData.surveyRecord,
        entriesByTeam,
        pageData.fieldsWithDetails.orderedSingle,
      );
    } else {
      return getExpressionData(
        $expressionName,
        pageData.surveyRecord,
        entriesByTeam,
        pageData.fieldsWithDetails.orderedSingle,
      );
    }
  });

  function tabClass(matching: string) {
    return $tab == matching ? "font-bold" : "font-light";
  }
</script>

<span>Match {match.number}</span>

{#if pageData.surveyType == "match"}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "info")} class={tabClass("info")}>Info</Button>
    {#if pageData.surveyRecord.pickLists.length}
      <Button onclick={() => ($tab = "picklists")} class={tabClass("picklists")}>Pick Lists</Button>
    {/if}
    {#if pageData.surveyRecord.expressions.length}
      <Button onclick={() => ($tab = "expressions")} class={tabClass("expressions")}>Expressions</Button>
    {/if}
  </div>
{/if}

{#if $tab == "info" || pageData.surveyType == "pit"}
  <div class="flex flex-col gap-2">
    {#each [match.red1, match.red2, match.red3] as team}
      {@const teamName = pageData.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      <Button
        onclick={() => {
          openDialog(ViewTeamDialog, { team: { number: team, name: teamName }, pageData: pageData });
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
      {@const teamName = pageData.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      <Button
        onclick={() => {
          openDialog(ViewTeamDialog, { team: { number: team, name: teamName }, pageData: pageData });
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
{:else if $tab == "picklists" && analysisData?.type == "picklist"}
  <select bind:value={$pickListName} class="text-theme bg-neutral-800 p-2 text-sm">
    {#each pageData.surveyRecord.pickLists as pickList}
      <option>{pickList.name}</option>
    {/each}
  </select>

  <div class="flex flex-col gap-4">
    {#each [match.red1, match.red2, match.red3] as team}
      {@const teamName = pageData.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      {@const percentage = analysisData.data.find((teamData) => teamData.team == team)?.percentage || 0}

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
      {@const teamName = pageData.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      {@const percentage = analysisData.data.find((teamData) => teamData.team == team)?.percentage || 0}

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
{:else if $tab == "expressions" && analysisData?.type == "expression"}
  <select bind:value={$expressionName} class="text-theme bg-neutral-800 p-2 text-sm">
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
      {@const teamName = pageData.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      {@const value = analysisData.data.find((teamData) => teamData.team == team)?.value || 0}
      {@const divWidth = Math.abs(
        ((value - Math.min(analysisData.minValue, 0)) /
          (analysisData.maxValue || analysisData.minValue || value || 1)) *
          100,
      )}

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
      {@const teamName = pageData.surveyRecord.teams.find((t) => t.number == team)?.name || ""}
      {@const value = analysisData.data.find((teamData) => teamData.team == team)?.value || 0}
      {@const divWidth = Math.abs(
        ((value - Math.min(analysisData.minValue, 0)) /
          (analysisData.maxValue || analysisData.minValue || value || 1)) *
          100,
      )}

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
