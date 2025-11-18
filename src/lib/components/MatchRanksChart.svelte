<script lang="ts">
  import { getOrdinal, type Match } from "$lib";
  import { getExpressionData, getPickListData, type TeamRank, type PickList, getFieldData } from "$lib/rank";
  import Button from "$lib/components/Button.svelte";
  import { type MatchEntry } from "$lib/entry";
  import { sortExpressions, type Expression } from "$lib/expression";
  import { getFieldsWithDetails, type SingleFieldWithDetails } from "$lib/field";
  import type { CompPageData } from "$lib/comp";
  import { ChartBarBigIcon, ChevronDownIcon, ChevronUpIcon } from "@lucide/svelte";
  import { groupRanks, type MatchSurvey } from "$lib/survey";
  import Anchor from "./Anchor.svelte";
  import { z } from "zod";
  import { goto } from "$app/navigation";
  import { slide } from "svelte/transition";

  let {
    pageData,
    match,
  }: {
    pageData: CompPageData;
    match: Match & { extraTeams?: string[] };
  } = $props();

  const anyTeamNames = $derived(pageData.compRecord.teams.some((t) => t.name));

  const redAlliance = $derived([match.red1, match.red2, match.red3].filter((team) => team));
  const blueAlliance = $derived([match.blue1, match.blue2, match.blue3].filter((team) => team));

  const matchSurveys = $derived(
    pageData.surveyRecords.filter((survey) => survey.type == "match").toSorted((a, b) => a.name.localeCompare(b.name)),
  );

  const groupedRanks = $derived(
    matchSurveys.map((survey) => {
      const fieldsWithDetails = getFieldsWithDetails(
        survey,
        pageData.fieldRecords.filter((f) => f.surveyId == survey.id),
      );

      return groupRanks(survey, fieldsWithDetails.orderedSingle);
    }),
  );

  const rankViewSchema = z
    .union([
      z.object({ surveyId: z.string(), pickList: z.string() }),
      z.object({ surveyId: z.string(), expression: z.string() }),
      z.object({ surveyId: z.string(), field: z.string() }),
      z.undefined(),
    ])
    .catch(undefined);

  function getRankView() {
    try {
      return JSON.parse(sessionStorage.getItem("match-rank-view") ?? "null");
    } catch {}
  }

  let selecting = $state(false);
  let selectedRanking = $state(initialRanking());

  function firstRankingChoice() {
    const survey = matchSurveys[0];
    if (!survey) return;

    if (survey.pickLists.length) {
      return getRanking({ survey, pickList: survey.pickLists[0] });
    }

    if (survey.expressions.length) {
      return getRanking({ survey, expression: survey.expressions.sort(sortExpressions)[0] });
    }

    if (survey.fieldIds.length) {
      const orderedSingleFields = getFieldsWithDetails(
        survey,
        pageData.fieldRecords.filter((f) => f.surveyId == survey.type),
      ).orderedSingle.filter((f) => ["number", "toggle", "rating", "timer"].includes(f.field.type));

      if (orderedSingleFields.length) {
        return getRanking({ survey, field: orderedSingleFields[0] });
      }
    }
  }

  function initialRanking() {
    const rankView = rankViewSchema.parse(getRankView());
    if (!rankView) return firstRankingChoice();

    const survey = matchSurveys.find((survey) => survey.id == rankView?.surveyId);
    if (!survey) return;

    if ("pickList" in rankView) {
      const name = rankView.pickList;
      const pickList = survey.pickLists.find((pl) => pl.name == name);
      if (pickList) return getRanking({ survey, pickList });
    }

    if ("expression" in rankView) {
      const name = rankView.expression;
      const expression = survey.expressions.find((e) => e.name == name);
      if (expression) return getRanking({ survey, expression });
    }

    if ("field" in rankView) {
      const id = rankView.field;
      const field = getFieldsWithDetails(
        survey,
        pageData.fieldRecords.filter((f) => f.surveyId == survey.id),
      ).orderedSingle.find((f) => f.field.id == id);
      if (field) return getRanking({ survey, field });
    }

    return firstRankingChoice();
  }

  function switchRanking(params: Parameters<typeof getRanking>[0]) {
    selecting = false;
    scrollTo(0, 0);
    const ranking = getRanking(params);
    if (ranking) {
      if (ranking.rankData?.type == "picklist") {
        const rankView = { surveyId: params.survey.id, pickList: ranking.rankData.pickList.name };
        sessionStorage.setItem("match-rank-view", JSON.stringify(rankView));
      } else if (ranking.rankData?.type == "expression") {
        const rankView = { surveyId: params.survey.id, expression: ranking.rankData.expression.name };
        sessionStorage.setItem("match-rank-view", JSON.stringify(rankView));
      } else if (ranking.rankData.type == "field") {
        const rankView = { surveyId: params.survey.id, field: ranking.rankData.field.field.id };
        sessionStorage.setItem("match-rank-view", JSON.stringify(rankView));
      }
    }
    return ranking;
  }

  function getRanking(
    params:
      | { survey: MatchSurvey; pickList: PickList }
      | { survey: MatchSurvey; expression: Expression }
      | { survey: MatchSurvey; field: SingleFieldWithDetails },
  ) {
    const entriesByTeam: Record<string, MatchEntry[]> = {};
    for (const entry of pageData.entryRecords.filter(
      (e): e is MatchEntry => e.surveyId == params.survey.id && e.type == "match",
    )) {
      if (entry.team in entriesByTeam) {
        entriesByTeam[entry.team].push(entry);
      } else {
        entriesByTeam[entry.team] = [entry];
      }
    }

    const fieldsWithDetails = getFieldsWithDetails(
      params.survey,
      pageData.fieldRecords.filter((field) => field.surveyId == params.survey.id),
    );

    if ("pickList" in params) {
      const rankData = getPickListData(
        pageData.compRecord,
        params.pickList,
        params.survey,
        entriesByTeam,
        fieldsWithDetails.orderedSingle,
      );
      if (!rankData) return;

      return { ...params, entriesByTeam, rankData };
    }

    if ("expression" in params) {
      const rankData = getExpressionData(
        pageData.compRecord,
        params.expression,
        params.survey,
        entriesByTeam,
        fieldsWithDetails.orderedSingle,
      );
      if (!rankData) return;

      return { ...params, entriesByTeam, rankData };
    }

    if ("field" in params) {
      const rankData = getFieldData(
        pageData.compRecord,
        params.field,
        params.survey,
        entriesByTeam,
        fieldsWithDetails.orderedSingle,
      );
      if (!rankData) return;

      return { ...params, entriesByTeam, rankData };
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col">
    <Button onclick={() => (selecting = !selecting)} class="text-sm">
      <ChartBarBigIcon class="text-theme size-5" />
      {#if selectedRanking}
        <span class="grow">
          {#if "pickList" in selectedRanking}
            {selectedRanking.pickList.name}
          {:else if "expression" in selectedRanking}
            {selectedRanking.expression.name}
          {:else if "field" in selectedRanking}
            {selectedRanking.field.detailedName}
          {/if}
        </span>
      {:else}
        <span class="grow">Select</span>
      {/if}

      <ChevronDownIcon
        class="text-theme size-5 transition-[rotate] {selecting || !selectedRanking ? 'rotate-180' : ''}"
      />
    </Button>

    {#if selecting || !selectedRanking}
      <div class="flex flex-col gap-4 border-2 border-t-0 border-neutral-800 p-3 pt-0" transition:slide>
        {#each groupedRanks as { survey, groups }}
          <div class="flex flex-col gap-3 first:mt-3">
            <h2 class="text-sm font-bold">{survey.name}</h2>

            {#each groups as group}
              <div class="flex flex-col">
                <span class="text-xs font-light">{group.category}</span>

                <div class="flex flex-wrap gap-2 text-sm">
                  {#each group.pickLists || [] as pickList}
                    {@const selected =
                      selectedRanking &&
                      "pickList" in selectedRanking &&
                      selectedRanking.pickList.name == pickList.name}

                    <Button
                      onclick={() => (selectedRanking = switchRanking({ survey, pickList }))}
                      class={selected ? "font-bold" : ""}
                    >
                      {pickList.name}
                    </Button>
                  {/each}

                  {#each group.expressions || [] as expression}
                    {@const selected =
                      selectedRanking &&
                      "expression" in selectedRanking &&
                      selectedRanking.expression.name == expression.name}

                    <Button
                      onclick={() => (selectedRanking = switchRanking({ survey, expression }))}
                      class={selected ? "font-bold" : ""}
                    >
                      {expression.name}
                    </Button>
                  {/each}

                  {#each group.fields || [] as field}
                    {@const selected =
                      selectedRanking &&
                      "field" in selectedRanking &&
                      selectedRanking.field.valueIndex == field.valueIndex}

                    <Button
                      onclick={() => (selectedRanking = switchRanking({ survey, field }))}
                      class={selected ? "font-bold" : ""}
                    >
                      {field.detailedName}
                    </Button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if selectedRanking}
    {@const pickListParam =
      selectedRanking.rankData.type == "picklist" &&
      "picklist=" + encodeURIComponent(selectedRanking.rankData.pickList.name)}
    {@const expressionParam =
      selectedRanking.rankData.type == "expression" &&
      "expression=" + encodeURIComponent(selectedRanking.rankData.expression.name)}
    {@const fieldParam =
      selectedRanking.rankData.type == "field" &&
      "field=" + encodeURIComponent(selectedRanking.rankData.field.field.id)}
    {@const objectParam = pickListParam || expressionParam || fieldParam || ""}
    {@const rankLinkParams = `surveyId=${encodeURIComponent(selectedRanking.survey.id)}&${objectParam}`}

    <div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
      {#each redAlliance as team}
        {@const teamRank = selectedRanking.rankData.teams.find((teamRank) => teamRank.team == team)}
        {@render teamRow(team, teamRank, "bg-red")}
      {/each}

      {#each blueAlliance as team}
        {@const teamRank = selectedRanking.rankData.teams.find((teamRank) => teamRank.team == team)}
        {@render teamRow(team, teamRank, "bg-blue")}
      {/each}

      {#each match.extraTeams || [] as team}
        {@const teamRank = selectedRanking.rankData.teams.find((teamRank) => teamRank.team == team)}
        {@render teamRow(team, teamRank, "bg-neutral-400")}
      {/each}
    </div>

    <Anchor route="comp/{pageData.compRecord.id}/rank?{rankLinkParams}" class="self-start text-sm">
      <ChartBarBigIcon class="text-theme size-5" />
      View rank
    </Anchor>
  {/if}
</div>

{#snippet teamRow(team: string, teamRank: TeamRank | undefined, bgColor: string)}
  {#if teamRank}
    <Button
      onclick={() => {
        if ("expression" in teamRank) {
          sessionStorage.setItem("metric-view", sessionStorage.getItem("rank-view") || "");
        }
        goto(`#/comp/${pageData.compRecord.id}/team/${teamRank.team}`);
      }}
      class="justify-center text-sm"
    >
      <div class="flex items-baseline">
        <span class="font-bold">{teamRank.rank}</span>
        <span class="hidden text-xs font-light sm:inline">{getOrdinal(teamRank.rank)}</span>
      </div>
    </Button>
  {/if}

  <div class="truncate {!teamRank ? 'col-span-2' : ''}">
    <div class="flex items-end justify-between gap-3">
      <div class="flex flex-col truncate">
        <span class="font-bold">{team}</span>
        {#if anyTeamNames}
          <span class="truncate text-xs font-light">
            {pageData.compRecord.teams.find((t) => t.number == team)?.name || "--"}
          </span>
        {/if}
      </div>
      {#if teamRank}
        {#if "value" in teamRank}
          {teamRank.value.toFixed(2) || 0}
        {:else}
          <span>{teamRank?.percentage.toFixed(1) || 0}<span class="text-sm">%</span></span>
        {/if}
      {/if}
    </div>
    <div class="bg-neutral-800">
      <div
        class={teamRank ? bgColor : ""}
        style="width:{(teamRank?.percentage.toFixed(2) ?? 100) || 0}%;height:6px"
      ></div>
    </div>
  </div>
{/snippet}
