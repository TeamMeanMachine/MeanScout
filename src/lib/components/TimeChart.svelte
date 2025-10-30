<script lang="ts">
  import type { CompPageData } from "$lib/comp";
  import { getFieldsWithDetails, type SingleFieldWithDetails } from "$lib/field";
  import { sortExpressions, type Expression } from "$lib/expression";
  import { compareMatches, matchUrl, sessionStorageStore, type Match, type MatchIdentifier, type Team } from "$lib";
  import { z } from "zod";
  import { groupRanks, type MatchSurvey } from "$lib/survey";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { colors, getExpressionData, getFieldData } from "$lib/rank";
  import Button from "./Button.svelte";
  import {
    ArrowRightIcon,
    ChartColumnBigIcon,
    ChartColumnStackedIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    TrendingDownIcon,
    TrendingUpIcon,
  } from "@lucide/svelte";
  import Anchor from "./Anchor.svelte";
  import { goto } from "$app/navigation";

  let {
    pageData,
    team,
  }: {
    pageData: CompPageData;
    team: Team;
  } = $props();

  const showInputs = sessionStorageStore<"true" | "">("metric-show-inputs", "true");

  const matchSurveys = $derived(
    pageData.surveyRecords.filter((survey) => survey.type == "match").toSorted((a, b) => a.name.localeCompare(b.name)),
  );

  const groupedRanks = $derived(
    matchSurveys
      .flatMap((survey) => {
        const fieldsWithDetails = getFieldsWithDetails(
          survey,
          pageData.fieldRecords.filter((f) => f.surveyId == survey.id),
        );
        return groupRanks(survey, fieldsWithDetails.orderedSingle);
      })
      .filter((group) => {
        if (group.pickLists?.length) {
          return false;
        }

        if (group.expressions?.length) {
          return !group.expressions.some((e) => e.scope == "survey");
        }

        return true;
      }),
  );

  const metricViewSchema = z
    .union([
      z.object({ surveyId: z.string(), expression: z.string() }),
      z.object({ surveyId: z.string(), field: z.string() }),
      z.undefined(),
    ])
    .catch(undefined);

  function getMetricView() {
    try {
      return JSON.parse(sessionStorage.getItem("metric-view") ?? "null");
    } catch {}
  }

  let selecting = $state(false);
  let selectedMetric = $state(initialMetric());

  function firstMetricChoice() {
    const survey = matchSurveys[0];
    if (!survey) return;

    if (survey.expressions.length) {
      return getMetric({
        survey,
        expression: survey.expressions.filter((e) => e.scope == "entry").sort(sortExpressions)[0],
      });
    }

    if (survey.fieldIds.length) {
      const orderedSingleFields = getFieldsWithDetails(
        survey,
        pageData.fieldRecords.filter((f) => f.surveyId == survey.type),
      ).orderedSingle.filter((f) => ["number", "toggle", "rating", "timer"].includes(f.field.type));

      if (orderedSingleFields.length) {
        return getMetric({ survey, field: orderedSingleFields[0] });
      }
    }
  }

  function initialMetric() {
    const metricView = metricViewSchema.parse(getMetricView());
    if (!metricView) return firstMetricChoice();

    const survey = pageData.surveyRecords.find(
      (survey): survey is MatchSurvey => survey.type == "match" && survey.id == metricView?.surveyId,
    );
    if (!survey) return;

    if ("expression" in metricView) {
      const name = metricView.expression;
      const expression = survey.expressions.find((e) => e.name == name);
      if (expression) return getMetric({ survey, expression });
    }

    if ("field" in metricView) {
      const id = metricView.field;
      const field = getFieldsWithDetails(
        survey,
        pageData.fieldRecords.filter((f) => f.surveyId == survey.id),
      ).orderedSingle.find((f) => f.field.id == id);
      if (field) return getMetric({ survey, field });
    }

    return firstMetricChoice();
  }

  function getMetric(
    params: { survey: MatchSurvey; expression: Expression } | { survey: MatchSurvey; field: SingleFieldWithDetails },
  ) {
    const fieldsWithDetails = getFieldsWithDetails(
      params.survey,
      pageData.fieldRecords.filter((field) => field.surveyId == params.survey.id),
    );

    const entries = pageData.entryRecords.filter((entry: Entry): entry is MatchEntry => {
      return entry.type == "match" && entry.team == team.number && entry.surveyId == params.survey.id;
    });

    const matches = pageData.compRecord.matches.filter((m) =>
      [m.red1, m.red2, m.red3, m.blue1, m.blue2, m.blue3].includes(team.number),
    );

    let allMatches: (Match & { extraTeams?: string[] })[] = [...matches];
    for (const entry of entries) {
      const entryMatchIdentifier: MatchIdentifier = {
        number: entry.match,
        level: entry.matchLevel,
        set: entry.matchSet,
      };
      const existingMatch = allMatches.find((m) => compareMatches(m, entryMatchIdentifier) == 0);

      if (existingMatch) {
        const teams = [
          existingMatch.red1,
          existingMatch.red2,
          existingMatch.red3,
          existingMatch.blue1,
          existingMatch.blue2,
          existingMatch.blue3,
          ...(existingMatch.extraTeams || []),
        ];

        if (!teams.includes(entry.team)) {
          existingMatch.extraTeams = [...(existingMatch.extraTeams || []), entry.team].toSorted((a, b) =>
            a.localeCompare(b),
          );
        }
      } else {
        allMatches.push({
          ...entryMatchIdentifier,
          red1: "",
          red2: "",
          red3: "",
          blue1: "",
          blue2: "",
          blue3: "",
          extraTeams: [entry.team],
        });
      }
    }

    allMatches = allMatches.toSorted(compareMatches);

    const entriesPerMatch = allMatches.map((match) => ({
      match,
      entries: entries
        .filter((e) => compareMatches({ number: e.match, level: e.matchLevel, set: e.matchSet }, match) == 0)
        .toSorted((a, b) => (a.scout || "").localeCompare(b.scout || "")),
    }));

    if ("expression" in params) {
      const data = entriesPerMatch.map(({ match, entries }) => {
        const rankData = getExpressionData(
          pageData.compRecord,
          params.expression,
          params.survey,
          { [team.number]: entries },
          fieldsWithDetails.orderedSingle,
        )?.teams[0];

        return {
          match,
          value: entries.length ? rankData?.value : undefined,
          inputs: entries.length ? rankData?.inputs : undefined,
        };
      });

      return createMetric(data, params, fieldsWithDetails.orderedSingle);
    }

    if ("field" in params) {
      const data = entriesPerMatch.map(({ match, entries }) => {
        const rankData = getFieldData(
          pageData.compRecord,
          params.field,
          params.survey,
          { [team.number]: entries },
          fieldsWithDetails.orderedSingle,
        )?.teams[0];

        return {
          match,
          value: entries.length ? rankData?.value : undefined,
          inputs: undefined,
        };
      });
      return createMetric(data, params, fieldsWithDetails.orderedSingle);
    }
  }

  function switchMetric(params: Parameters<typeof getMetric>[0]) {
    selecting = false;
    const metric = getMetric(params);
    if (metric) {
      if ("expression" in metric) {
        const metricView = { surveyId: params.survey.id, expression: metric.expression.name };
        sessionStorage.setItem("metric-view", JSON.stringify(metricView));
      } else if ("field" in metric) {
        const metricView = { surveyId: params.survey.id, field: metric.field.field.id };
        sessionStorage.setItem("metric-view", JSON.stringify(metricView));
      }
    }
    return metric;
  }

  function createMetric(
    data: {
      match: MatchIdentifier;
      value: number | undefined;
      inputs: { value: number; percentage: number }[] | undefined;
    }[],
    params: { survey: MatchSurvey; expression: Expression } | { survey: MatchSurvey; field: SingleFieldWithDetails },
    orderedSingleFields: SingleFieldWithDetails[],
  ) {
    const values = data.map((d) => d.value).filter((v) => v !== undefined);
    const max = values.length ? Math.max(...values) : 0;
    const inputMaxes = data.map((d) => (d.inputs?.length ? Math.max(...d.inputs.map((i) => i.value)) : undefined));

    let inputNames: string[] | undefined = undefined;
    if (!("expression" in params)) {
      inputNames = undefined;
    } else if (params.expression.input.from == "expressions") {
      inputNames = params.expression.input.expressionNames;
    } else if (params.expression.input.from == "fields") {
      inputNames = params.expression.input.fieldIds
        .map((id) => orderedSingleFields.find((f) => f.field.id == id)?.detailedName)
        .filter((f) => f !== undefined);
    }

    return {
      ...params,
      inputNames,
      max,
      min: values.length ? Math.min(...values) : 0,
      average: values.reduce((prev, curr) => prev + curr, 0) / (values.length || 1),
      trend: calculateTrend(values),
      data: data.map((matchValuePair) => {
        let percentage = 0;
        if (matchValuePair.value !== undefined) {
          percentage = matchValuePair.value / max;
        }
        if (matchValuePair.inputs !== undefined) {
          matchValuePair.inputs = matchValuePair.inputs.map((input, index) => {
            const max = inputMaxes[index];
            if (max !== undefined) {
              return { ...input, percentage: input.value / max };
            }
            return input;
          });
        }
        return { ...matchValuePair, percentage };
      }),
    };
  }

  function calculateTrend(data: number[]) {
    const n = data.length;
    if (!n) return 0;

    const sumX = data.reduce((prev, _, index) => prev + index + 1, 0);
    const sumXSquared = data.reduce((prev, _, index) => prev + (index + 1) ** 2, 0);
    const sumY = data.reduce((prev, curr) => prev + curr, 0);
    const sumXY = data.reduce((prev, curr, index) => prev + curr * (index + 1), 0);

    return (n * sumXY - sumX * sumY) / (n * sumXSquared - sumX ** 2);
  }
</script>

<div class="flex flex-col gap-4">
  <Button onclick={() => (selecting = !selecting)} class="text-sm">
    <ChartColumnBigIcon class="text-theme size-5" />
    {#if selectedMetric}
      <span class="grow">
        {#if "expression" in selectedMetric}
          {selectedMetric.expression.name}
        {:else if "field" in selectedMetric}
          {selectedMetric.field.detailedName}
        {/if}
      </span>
    {:else}
      <span class="grow">Select</span>
    {/if}

    {#if !selecting && selectedMetric}
      <ChevronDownIcon class="text-theme size-5" />
    {:else}
      <ChevronUpIcon class="text-theme size-5" />
    {/if}
  </Button>

  {#if !selecting && selectedMetric}
    {@const expressionParam =
      "expression" in selectedMetric && "expression=" + encodeURIComponent(selectedMetric.expression.name)}
    {@const fieldParam = "field" in selectedMetric && "field=" + encodeURIComponent(selectedMetric.field.field.id)}
    {@const objectParam = expressionParam || fieldParam || ""}
    {@const rankLinkParams = `surveyId=${encodeURIComponent(selectedMetric.survey.id)}&${objectParam}`}

    <div class="flex flex-wrap gap-x-6 gap-y-4 text-sm">
      <div class="flex flex-col">
        <span class="text-xs font-light">Trend</span>
        <span>
          {#if selectedMetric.trend > 0}
            <TrendingUpIcon class="inline size-5" />
          {:else if selectedMetric.trend < 0}
            <TrendingDownIcon class="inline size-5" />
          {/if}
          {selectedMetric.trend > 0 ? "+" : ""}{selectedMetric.trend.toFixed(2)}
        </span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs font-light">Average</span>
        <span>{selectedMetric.average.toFixed(2)}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs font-light">Min</span>
        <span>{selectedMetric.min}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs font-light">Max</span>
        <span>{selectedMetric.max}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      {#if selectedMetric.inputNames?.length}
        <div class="flex flex-wrap gap-x-3 gap-y-2 text-xs">
          <Button
            onclick={() => ($showInputs = $showInputs ? "" : "true")}
            disabled={selectedMetric.inputNames.length <= 1}
            class="py-1 {$showInputs ? 'font-bold' : 'font-light'}"
          >
            {#if $showInputs && selectedMetric.inputNames.length > 1}
              <ChartColumnStackedIcon class="text-theme size-5" />
            {:else}
              <ChartColumnBigIcon class="text-theme size-5" />
            {/if}
          </Button>

          {#each selectedMetric.inputNames as name, i}
            {@const disabled = selectedMetric.data.every((d) => !d.inputs?.[i].value)}
            {@const color = disabled ? "var(--color-neutral-500)" : colors[i % colors.length]}

            <Button
              onclick={() => {
                if (selectedMetric && "expression" in selectedMetric) {
                  if (selectedMetric.expression.input.from == "expressions") {
                    selectedMetric = switchMetric({
                      survey: selectedMetric.survey,
                      expression: selectedMetric.survey.expressions.find((e) => e.name == name)!,
                    });
                  } else if (selectedMetric.expression.input.from == "fields") {
                    const fieldId = selectedMetric.expression.input.fieldIds[i];
                    const fieldWithDetails = getFieldsWithDetails(
                      selectedMetric.survey,
                      pageData.fieldRecords.filter((f) => f.surveyId == selectedMetric!.survey.id),
                    ).orderedSingle.find((f) => f.field.id == fieldId);

                    if (!fieldWithDetails) {
                      return;
                    }

                    selectedMetric = switchMetric({
                      survey: selectedMetric.survey,
                      field: fieldWithDetails,
                    });
                  }
                }
              }}
              {disabled}
            >
              {#if $showInputs && selectedMetric.inputNames.length > 1}
                <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
              {/if}
              {name}
            </Button>
          {/each}
        </div>
      {/if}

      <div class="-m-1 -mx-3 flex items-end gap-3 overflow-x-auto p-1 px-3 text-center text-sm">
        {#each selectedMetric.data as { match, value, percentage, inputs }}
          {@const color = `rgb(var(--theme-color) / ${(percentage * 100).toFixed(2)}%)`}

          <div class="flex shrink-0 grow basis-8 flex-col">
            <div>{value ?? "_"}</div>
            {#if $showInputs && inputs && inputs.length > 1}
              {@const totalHeightPixels = percentage * 256}

              <div class="flex flex-col" style="height:{totalHeightPixels}px">
                {#each inputs.toReversed() as input, i}
                  {#if input.value}
                    {@const color = colors[inputs.length - 1 - i]}
                    {@const heightPercent = (input.value / (value || 0)) * 100}

                    <div
                      class="flex flex-col justify-center overflow-hidden border-y text-xs text-black"
                      style="background-color:{color};height:{heightPercent}%;border-color:rgba(0,0,0,0.25)"
                    >
                      {input.value}
                    </div>
                  {/if}
                {/each}
              </div>
            {:else}
              <div
                class="shrink-0 {value !== undefined ? 'min-h-px' : ''}"
                style="background-color:{color};height:{percentage * 256}px"
              ></div>
            {/if}
            <Button
              onclick={() => {
                sessionStorage.setItem("rank-view", sessionStorage.getItem("metric-view") || "");
                goto(`#/${matchUrl(match, pageData.compRecord.id)}`);
              }}
              class="min-w-13 justify-center px-0 text-nowrap!"
            >
              {#if match.level && match.level != "qm"}
                {match.level}{match.set || 1}-{match.number}
              {:else}
                {match.number}
              {/if}
            </Button>
          </div>
        {/each}
      </div>
    </div>

    <Anchor route="comp/{pageData.compRecord.id}/rank?{rankLinkParams}" class="self-start text-sm">
      View rank
      <ArrowRightIcon class="text-theme size-5" />
    </Anchor>
  {:else}
    {#each groupedRanks as group}
      <div class="flex flex-col gap-2">
        <div class="flex flex-col">
          <h2 class="text-sm">{group.survey.name}</h2>
          <span class="text-xs font-light">{group.category}</span>
        </div>

        <div class="flex flex-wrap gap-2 text-sm">
          {#each group.expressions || [] as expression}
            <Button
              onclick={() => {
                scrollTo(0, 0);
                selectedMetric = switchMetric({ survey: group.survey, expression });
              }}
            >
              {expression.name}
            </Button>
          {/each}
          {#each group.fields || [] as field}
            <Button
              onclick={() => {
                scrollTo(0, 0);
                selectedMetric = switchMetric({ survey: group.survey, field });
              }}
            >
              {field.detailedName}
            </Button>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
