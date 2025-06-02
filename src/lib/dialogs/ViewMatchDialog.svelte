<script lang="ts">
  import { getMatchTeamFontWeight, getOrdinal, type Match } from "$lib";
  import { getExpressionData, getPickListData, type AnalysisData, type AnalysisTeamData } from "$lib/analysis";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import { getMatchEntriesByTeam, type MatchEntry } from "$lib/entry";
  import { sortExpressions } from "$lib/expression";
  import type { SurveyPageData } from "$lib/survey";
  import ViewTeamDialog from "./ViewTeamDialog.svelte";

  let {
    pageData,
    match,
  }: {
    pageData: SurveyPageData;
    match: Match;
  } = $props();

  const hideAnalysis =
    pageData.surveyType == "pit" ||
    !pageData.fieldRecords.length ||
    !pageData.entryRecords.length ||
    (!pageData.surveyRecord.pickLists.length && !pageData.surveyRecord.expressions.length);

  const entriesByTeam = getMatchEntriesByTeam(pageData.entryRecords as IDBRecord<MatchEntry>[]);

  const sortedExpressions =
    pageData.surveyType == "match" ? pageData.surveyRecord.expressions.toSorted(sortExpressions) : [];

  const expressions = Object.groupBy(sortedExpressions, (e) => {
    if (e.scope == "entry" && e.input.from == "expressions") return "entryDerived";
    if (e.scope == "entry" && e.input.from == "tba") return "entryTba";
    if (e.scope == "entry" && e.input.from == "fields") return "entryPrimitive";
    if (e.scope == "survey" && e.input.from == "expressions") return "surveyDerived";
    if (e.scope == "survey" && e.input.from == "tba") return "surveyTba";
    if (e.scope == "survey" && e.input.from == "fields") return "surveyPrimitive";
    return "";
  });

  let selectedString = $state(defaultSelectionString());

  let selected = $derived.by(() => {
    if (!selectedString || pageData.surveyType != "match") return defaultSelection();
    const [type, name] = selectedString.split("-", 2);

    if (type == "picklist") {
      const pickList = pageData.surveyRecord.pickLists.find((pl) => pl.name == name);
      if (pickList) return { type: "picklist" as const, pickList };
    } else if (type == "expression") {
      const expression = pageData.surveyRecord.expressions.find((e) => e.name == name);
      if (expression) return { type: "expression" as const, expression };
    }

    return defaultSelection();
  });

  let analysisData = $derived.by<AnalysisData | undefined>(() => {
    if (hideAnalysis) {
      return;
    }

    if (selected?.type == "picklist") {
      return getPickListData(
        selected.pickList.name,
        pageData.surveyRecord,
        entriesByTeam,
        pageData.fieldsWithDetails.orderedSingle,
      );
    } else if (selected?.type == "expression") {
      return getExpressionData(
        selected.expression.name,
        pageData.surveyRecord,
        entriesByTeam,
        pageData.fieldsWithDetails.orderedSingle,
      );
    }
  });

  $effect(() => {
    if (!selectedString) return;
    sessionStorage.setItem("analysis-view", selectedString);
  });

  function defaultSelection() {
    if (pageData.surveyType != "match") return;

    if (pageData.surveyRecord.pickLists.length) {
      return { type: "picklist" as const, pickList: pageData.surveyRecord.pickLists[0] };
    }

    if (sortedExpressions.length) {
      return { type: "expression" as const, expression: sortedExpressions[0] };
    }
  }

  function defaultSelectionString() {
    if (pageData.surveyType != "match") return;

    const value = sessionStorage.getItem("analysis-view");

    if (value) {
      const [type, name] = value.split("-", 2);

      if (
        (type == "picklist" && pageData.surveyRecord.pickLists.some((pl) => pl.name == name)) ||
        (type == "expression" && sortedExpressions.some((e) => e.name == name))
      ) {
        return value;
      }
    }

    if (pageData.surveyRecord.pickLists.length) {
      return "picklist-" + pageData.surveyRecord.pickLists[0].name;
    }

    if (sortedExpressions.length) {
      return "expression-" + sortedExpressions[0].name;
    }
  }
</script>

<span>Match {match.number}</span>

{#if !hideAnalysis}
  <select bind:value={selectedString} class="text-theme min-w-0 grow bg-neutral-800 p-2 text-sm">
    {#if pageData.surveyRecord.pickLists.length}
      <optgroup label="Pick Lists">
        {#each pageData.surveyRecord.pickLists as pickList}
          <option value="picklist-{pickList.name}">{pickList.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.surveyDerived?.length}
      <optgroup label="Survey Expressions from expressions">
        {#each expressions.surveyDerived as expression}
          <option value="expression-{expression.name}">{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.surveyTba?.length}
      <optgroup label="Survey Expressions from TBA">
        {#each expressions.surveyTba as expression}
          <option value="expression-{expression.name}">{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.surveyPrimitive?.length}
      <optgroup label="Survey Expressions from fields">
        {#each expressions.surveyPrimitive as expression}
          <option value="expression-{expression.name}">{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.entryDerived?.length}
      <optgroup label="Entry Expressions from expressions">
        {#each expressions.entryDerived as expression}
          <option value="expression-{expression.name}">{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.entryTba?.length}
      <optgroup label="Entry Expressions from TBA">
        {#each expressions.entryTba as expression}
          <option value="expression-{expression.name}">{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
    {#if expressions.entryPrimitive?.length}
      <optgroup label="Entry Expressions from fields">
        {#each expressions.entryPrimitive as expression}
          <option value="expression-{expression.name}">{expression.name}</option>
        {/each}
      </optgroup>
    {/if}
  </select>
{/if}

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each [match.red1, match.red2, match.red3] as team}
    {@const teamData = analysisData?.data.find((teamData) => teamData.team == team) ?? team}
    {@render teamRow("red", teamData)}
  {/each}

  {#each [match.blue1, match.blue2, match.blue3] as team}
    {@const teamData = analysisData?.data.find((teamData) => teamData.team == team) ?? team}
    {@render teamRow("blue", teamData)}
  {/each}
</div>

{#snippet teamRow(alliance: "red" | "blue", team: string | AnalysisTeamData)}
  {#if typeof team == "string"}
    {@const teamName = pageData.surveyRecord.teams.find((t) => t.number == team)?.name || ""}

    <Button
      onclick={() => {
        openDialog(ViewTeamDialog, { team: { number: team, name: teamName }, pageData });
      }}
      class="col-span-full"
    >
      <div class="flex flex-col">
        {#if teamName}
          <span class="text-xs no-underline! {getMatchTeamFontWeight(team)}">{teamName}</span>
        {/if}
        <span class="{alliance == 'red' ? 'text-red' : 'text-blue'} {getMatchTeamFontWeight(team)}">{team}</span>
      </div>
    </Button>
  {:else}
    {@const rank = analysisData?.data.findIndex((td) => td.team == team.team)}

    <Button
      onclick={() => {
        openDialog(ViewTeamDialog, { pageData, team: { number: team.team, name: team.teamName } });
      }}
      class="justify-center text-sm"
    >
      <div class="flex items-baseline">
        {#if rank !== undefined}
          <span class="font-bold">{rank + 1}</span>
          <span class="hidden text-xs font-light sm:inline">{getOrdinal(rank + 1)}</span>
        {:else}
          -
        {/if}
      </div>
    </Button>

    <div>
      <div class="flex items-end justify-between gap-3">
        <div class="flex flex-col">
          <span class="font-bold">{team.team}</span>
          {#if team?.teamName}
            <span class="text-xs font-light">{team?.teamName}</span>
          {/if}
        </div>
        {#if team && "value" in team}
          {team.value.toFixed(2) || 0}
        {:else}
          <span>{team?.percentage.toFixed(1) || 0}<span class="text-sm">%</span></span>
        {/if}
      </div>
      <div class="bg-neutral-800">
        <div
          class={alliance == "red" ? "bg-red" : "bg-blue"}
          style="width:{team?.percentage.toFixed(2) || 0}%;height:6px"
        ></div>
      </div>
    </div>
  {/if}
{/snippet}
