<script lang="ts">
  import { allianceTeamLabels, getOrdinal, sessionStorageStore, type Match } from "$lib";
  import {
    getExpressionData,
    getPickListData,
    type TeamRank,
    type PickList,
    getFieldData,
    colors,
    type RankData,
  } from "$lib/rank";
  import Button from "$lib/components/Button.svelte";
  import { type MatchEntry } from "$lib/entry";
  import { sortExpressions, type Expression } from "$lib/expression";
  import { getFieldsWithDetails, type SingleFieldWithDetails } from "$lib/field";
  import type { CompPageData } from "$lib/comp";
  import { ArrowRightIcon, ChartBarBigIcon, ChevronDownIcon, UserPenIcon, UserPlusIcon } from "@lucide/svelte";
  import { groupRanks, type MatchSurvey } from "$lib/survey";
  import Anchor from "./Anchor.svelte";
  import { z } from "zod";
  import { invalidateAll } from "$app/navigation";
  import { slide } from "svelte/transition";
  import { openDialog } from "$lib/dialog";
  import AddTeamToAllianceDialog from "$lib/dialogs/AddTeamToAllianceDialog.svelte";
  import { idb } from "$lib/idb";

  let {
    pageData,
    match,
  }: {
    pageData: CompPageData;
    match: Match & { extraTeams?: string[] };
  } = $props();

  const highlightedTeam = sessionStorageStore<string>("team-highlight", "");

  const alliancesWithIndexes = $derived(pageData.compRecord.alliances?.map((a, i) => ({ ...a, i })));
  const allianceTeams = $derived(pageData.compRecord.alliances?.flatMap((a) => a.teams) || []);

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

  const orderedSingleFields = $derived.by(() => {
    if (!selectedRanking) return [];
    return getFieldsWithDetails(
      selectedRanking.rankData.survey,
      pageData.fieldRecords.filter((f) => f.surveyId == selectedRanking!.rankData.survey.id),
    ).orderedSingle;
  });

  const legacyInputNames = $derived.by(() => {
    if (!selectedRanking) return [];
    if (selectedRanking.rankData.type == "expression") {
      const inputs: string[] = [];
      if (selectedRanking.rankData.expression.input.from == "expressions") {
        inputs.push(...selectedRanking.rankData.expression.input.expressionNames);
      } else if (selectedRanking.rankData.expression.input.from == "fields") {
        inputs.push(
          ...selectedRanking.rankData.expression.input.fieldIds
            .map((id) => orderedSingleFields.find((f) => f.field.id == id)?.detailedName)
            .filter((f) => f !== undefined),
        );
      }
      return inputs;
    }
    return [];
  });

  const inputNames = $derived.by(() => {
    if (!selectedRanking) return [];
    if (selectedRanking.rankData.type == "picklist") {
      return selectedRanking.rankData.pickList.weights
        .map((w) => {
          if (w.from == "field") {
            return orderedSingleFields.find((f) => f.field.id == w.fieldId)?.detailedName;
          }
          return w.expressionName;
        })
        .filter((i) => i != undefined);
    } else if (selectedRanking.rankData.type == "expression") {
      const inputs = $state.snapshot(legacyInputNames);
      if (selectedRanking.rankData.expression.inputs?.length) {
        inputs.push(
          ...selectedRanking.rankData.expression.inputs
            .map((i) => {
              if (i.from == "expression") {
                return i.expressionName;
              } else if (i.from == "tba") {
                return i.tbaMetric;
              } else {
                return orderedSingleFields.find((f) => f.field.id == i.fieldId)?.detailedName;
              }
            })
            .filter((i) => i !== undefined),
        );
      }
      return inputs;
    }
    return [];
  });

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

    {#if inputNames.length}
      <div class="-mx-3 -my-1 flex gap-2 overflow-x-auto px-3 py-1 text-xs">
        {#key inputNames}
          {#each inputNames as name, i}
            {@const color = inputNames.length > 1 ? colors[i % colors.length] : "var(--color-theme)"}

            <Button
              onclick={() => {
                if (!selectedRanking) return;
                if ("pickList" in selectedRanking) {
                  if (selectedRanking.pickList.weights[i].from == "field") {
                    const fieldId = selectedRanking.pickList.weights[i].fieldId;
                    const field = orderedSingleFields.find((f) => f.field.id == fieldId);
                    if (field) {
                      selectedRanking = switchRanking({ survey: selectedRanking.survey, field });
                      return;
                    }
                  }
                  const expression = selectedRanking.survey.expressions.find((e) => e.name == name);
                  if (expression) {
                    selectedRanking = switchRanking({ survey: selectedRanking.survey, expression });
                    return;
                  }
                } else if ("expression" in selectedRanking) {
                  if (i >= legacyInputNames.length && selectedRanking.expression.inputs?.length) {
                    const input = selectedRanking.expression.inputs.at(i - legacyInputNames.length);
                    if (input?.from == "expression") {
                      const expression = selectedRanking.survey.expressions.find((e) => e.name == input.expressionName);
                      if (expression) {
                        selectedRanking = switchRanking({ survey: selectedRanking.survey, expression });
                        return;
                      }
                    } else if (input?.from == "field") {
                      const field = orderedSingleFields.find((f) => f.field.id == input.fieldId);
                      if (field) {
                        selectedRanking = switchRanking({ survey: selectedRanking.survey, field });
                        return;
                      }
                    }
                  } else if (selectedRanking.expression.input.from == "expressions") {
                    const expression = selectedRanking.survey.expressions.find((e) => e.name == name);
                    if (expression) {
                      selectedRanking = switchRanking({ survey: selectedRanking.survey, expression });
                      return;
                    }
                  } else if (selectedRanking.expression.input.from == "fields") {
                    const fieldId = selectedRanking.expression.input.fieldIds[i];
                    const field = orderedSingleFields.find((f) => f.field.id == fieldId);
                    if (field) {
                      selectedRanking = switchRanking({ survey: selectedRanking.survey, field });
                      return;
                    }
                  }
                }
              }}
              class="h-12 flex-col items-stretch justify-between gap-0!"
            >
              <div class="flex items-start justify-between font-light">
                <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
                {#if selectedRanking.rankData.type == "picklist"}
                  {selectedRanking.rankData.pickList.weights[i].percentage}%
                {/if}
              </div>
              <span class="text-nowrap">{name}</span>
            </Button>
          {/each}
        {/key}
      </div>
    {/if}

    <div class="grid gap-x-2 gap-y-4" style="grid-template-columns:min-content auto">
      {#each redAlliance as team}
        {@const teamRank = selectedRanking.rankData.teams.find((teamRank) => teamRank.team == team)}
        {#if teamRank}
          {@render teamRankRow(teamRank, selectedRanking.rankData, "var(--color-red)")}
        {:else}
          {@render teamRow(team, "var(--color-red)")}
        {/if}
      {/each}

      {#each blueAlliance as team}
        {@const teamRank = selectedRanking.rankData.teams.find((teamRank) => teamRank.team == team)}
        {#if teamRank}
          {@render teamRankRow(teamRank, selectedRanking.rankData, "var(--color-blue)")}
        {:else}
          {@render teamRow(team, "var(--color-blue)")}
        {/if}
      {/each}

      {#each match.extraTeams || [] as team}
        {@const teamRank = selectedRanking.rankData.teams.find((teamRank) => teamRank.team == team)}
        {#if teamRank}
          {@render teamRankRow(teamRank, selectedRanking.rankData, "var(--color-white)")}
        {:else}
          {@render teamRow(team, "var(--color-white)")}
        {/if}
      {/each}
    </div>

    <Anchor route="comp/{pageData.compRecord.id}/rank?{rankLinkParams}" class="self-start text-sm">
      View rank
      <ArrowRightIcon class="text-theme size-5" />
    </Anchor>
  {/if}
</div>

{#snippet teamRow(team: string, color: string)}
  <div class="col-span-2 truncate">
    <div class="font-bold" style="color:{color}">{team}</div>
    {#if anyTeamNames}
      <div class="truncate text-xs font-light">
        {pageData.compRecord.teams.find((t) => t.number == team)?.name || "--"}
      </div>
    {/if}
    <div class="bg-neutral-800" style="height:6px"></div>
  </div>
{/snippet}

{#snippet teamRankRow(teamRank: TeamRank, rankData: RankData, color: string)}
  {@const isHighlighted = $highlightedTeam == teamRank.team}
  {@const allianceWithIndex = alliancesWithIndexes?.find((a) => a.teams.includes(teamRank.team))}
  {@const percentageStr = teamRank.percentage.toFixed(2) + "%"}

  <Button
    onclick={() => ($highlightedTeam = isHighlighted ? "" : teamRank.team)}
    class="h-[46px] justify-center text-sm"
  >
    <div class="flex items-baseline" style="color:{color}">
      <span class="font-bold" style="color:{color}">{teamRank.rank}</span>
      <span class="hidden text-xs sm:inline">{getOrdinal(teamRank.rank)}</span>
    </div>
  </Button>

  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div onclick={() => ($highlightedTeam = teamRank.team)} class="min-w-0">
    <div class={["border-neutral-700 p-0 transition-[border,padding]", isHighlighted && "border-x-4 border-t-4 px-1"]}>
      <div class="flex items-end justify-between gap-3">
        <div class="flex flex-col truncate">
          <div class="font-bold" style="color:{color}">{teamRank.team}</div>
          {#if teamRank.teamName}
            <div class="truncate text-xs font-light tracking-tighter">{teamRank.teamName}</div>
          {/if}
        </div>

        <div class="flex flex-col text-end">
          {#if allianceWithIndex}
            <div class="truncate text-xs font-light tracking-tighter">
              a{allianceWithIndex.i + 1}
              {(allianceTeamLabels[allianceWithIndex.teams.indexOf(teamRank.team)] || "Backup").slice(0, 4)}
            </div>
          {/if}
          {#if "value" in teamRank}
            {teamRank.value.toFixed(2)}
          {:else}
            <span>{teamRank.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
          {/if}
        </div>
      </div>

      {#if isHighlighted}
        <div transition:slide>
          <div class="col-span-full flex flex-wrap items-center justify-between gap-2 py-1 text-sm">
            <Anchor route="comp/{pageData.compRecord.id}/team/{teamRank.team}">
              View team
              <ArrowRightIcon class="text-theme size-5" />
            </Anchor>
            <Button
              onclick={() => {
                openDialog(AddTeamToAllianceDialog, {
                  team: { number: teamRank.team, name: teamRank.teamName },
                  compAlliances: pageData.compRecord.alliances || [],
                  onadd(newAlliances) {
                    idb.put(
                      "comps",
                      $state.snapshot({
                        ...pageData.compRecord,
                        alliances: newAlliances,
                        modified: new Date(),
                      }),
                    ).onsuccess = invalidateAll;
                  },
                });
              }}
            >
              {#if allianceTeams.includes(teamRank.team)}
                <UserPenIcon class="text-theme size-5" />
              {:else}
                <UserPlusIcon class="text-theme size-5" />
              {/if}
              Alliance
            </Button>
          </div>

          {#if inputNames.length > 1}
            <div class="-mx-2 mt-1">
              <div class="flex text-center text-xs font-light tracking-tighter" style="width:{percentageStr}">
                {#if "value" in teamRank && rankData.type != "picklist"}
                  {#each teamRank.inputs as input, i}
                    {@const divWidth = input.value * teamRank.percentage}
                    {#if divWidth}
                      <div title={inputNames[i]} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                        <div class="truncate">{inputNames[i]}</div>
                      </div>
                    {/if}
                  {/each}
                {:else if !("value" in teamRank) && rankData.type == "picklist"}
                  {#each rankData.pickList.weights as _, i}
                    {@const divWidth = teamRank.inputs[i] * teamRank.percentage}
                    {#if divWidth}
                      <div title={inputNames[i]} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                        <div class="truncate">{inputNames[i]}</div>
                      </div>
                    {/if}
                  {/each}
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class={["transition-[background]", isHighlighted ? "bg-neutral-700" : "bg-neutral-800"]}>
      {#if inputNames.length > 1}
        <div class="flex" style="width:{percentageStr}">
          {#if "value" in teamRank && rankData.type != "picklist"}
            {#each teamRank.inputs as input, i}
              {@const inputName = rankData.inputs[i].name}
              {@const color = colors[i % colors.length]}
              {@const opacity = input.percentage.toFixed(2)}
              {@const divWidth = input.value * teamRank.percentage}

              {#if divWidth}
                <div title={inputName} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                  <div
                    class="border-x-2"
                    style="background-color:{color};height:6px;opacity:{opacity}%;border-color:rgba(0,0,0,0.25)"
                  ></div>
                </div>
              {/if}
            {/each}
          {:else if !("value" in teamRank) && rankData.type == "picklist"}
            {#each rankData.pickList.weights as weight, i}
              {@const color = colors[i % colors.length]}
              {@const opacity = ((teamRank.inputs[i] / weight.percentage) * 100).toFixed(2)}
              {@const divWidth = teamRank.inputs[i] * teamRank.percentage}

              {#if divWidth}
                <div title={inputNames[i]} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                  <div
                    class="border-x-2"
                    style="background-color:{color};height:6px;opacity:{opacity}%;border-color:rgba(0,0,0,0.25)"
                  ></div>
                </div>
              {/if}
            {/each}
          {/if}
        </div>
      {:else}
        <div style="background-color:{color};opacity:{percentageStr};width:{percentageStr};height:6px"></div>
      {/if}
    </div>

    {#if inputNames.length > 1}
      <div class="flex text-center text-xs font-light tracking-tighter" style="width:{percentageStr}">
        {#if "value" in teamRank && rankData.type != "picklist"}
          {#each teamRank.inputs as input, i}
            {@const inputName = rankData.inputs[i].name}
            {@const divWidth = input.value * teamRank.percentage}
            {#if divWidth}
              <div title={inputName} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                <div>{input.value.toFixed()}</div>
              </div>
            {/if}
          {/each}
        {:else if !("value" in teamRank) && rankData.type == "picklist"}
          {#each rankData.pickList.weights as weight, i}
            {@const divWidth = teamRank.inputs[i] * teamRank.percentage}
            {#if divWidth}
              <div title={inputNames[i]} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                <div>{((teamRank.inputs[i] / weight.percentage) * 100).toFixed()}%</div>
              </div>
            {/if}
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/snippet}
