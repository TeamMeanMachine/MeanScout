<script lang="ts">
  import type { CompPageData } from "$lib/comp";
  import { getFieldsWithDetails, type SingleFieldWithDetails } from "$lib/field";
  import type { Expression } from "$lib/expression";
  import type { Team } from "$lib";
  import { z } from "zod";
  import { groupRanks, type MatchSurvey } from "$lib/survey";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { getExpressionData, getFieldData } from "$lib/rank";
  import Button from "./Button.svelte";
  import { ChartBarBigIcon, ChartColumnBigIcon, ChevronDownIcon, ChevronUpIcon } from "@lucide/svelte";
  import Anchor from "./Anchor.svelte";
  import { goto } from "$app/navigation";

  let {
    pageData,
    team,
  }: {
    pageData: CompPageData;
    team: Team;
  } = $props();

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
      .filter((group) => !group.pickLists?.length),
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

  function initialMetric() {
    const metricView = metricViewSchema.parse(getMetricView());
    if (!metricView) return;

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

    const entriesPerMatch = [...new Set([...entries.map((e) => e.match), ...matches.map((m) => m.number)])]
      .toSorted((a, b) => a - b)
      .map((number) => ({
        number,
        entries: entries
          .filter((e) => e.match == number)
          .toSorted((a, b) => (a.scout || "").localeCompare(b.scout || "")),
      }));

    if ("expression" in params) {
      let metric = {
        ...params,
        max: 0,
        min: 0,
        average: 0,
        data: entriesPerMatch.map(({ number, entries }) => ({
          match: number,
          value: entries.length
            ? getExpressionData(
                pageData.compRecord,
                params.expression,
                params.survey,
                { [team.number]: entries },
                fieldsWithDetails.orderedSingle,
              )?.teams[0].value
            : undefined,
          percentage: 0,
        })),
      };

      const values = metric.data.map((d) => d.value).filter((v) => v !== undefined);
      metric.max = values.length ? Math.max(...values) : 0;
      metric.min = values.length ? Math.min(...values) : 0;
      metric.average = values.reduce((prev, curr) => prev + curr, 0) / (values.length || 1);

      metric.data = metric.data.map((matchValuePair) => {
        if (matchValuePair.value !== undefined) {
          matchValuePair.percentage = matchValuePair.value / metric.max;
        }
        return matchValuePair;
      });

      return metric;
    }

    if ("field" in params) {
      let metric = {
        ...params,
        max: 0,
        min: 0,
        average: 0,
        data: entriesPerMatch.map(({ number, entries }) => {
          return {
            match: number,
            value: entries.length
              ? getFieldData(
                  pageData.compRecord,
                  params.field,
                  params.survey,
                  { [team.number]: entries },
                  fieldsWithDetails.orderedSingle,
                )?.teams[0].value
              : undefined,
            percentage: 0,
          };
        }),
      };

      const values = metric.data.map((d) => d.value).filter((v) => v !== undefined);
      metric.max = values.length ? Math.max(...values) : 0;
      metric.min = values.length ? Math.min(...values) : 0;
      metric.average = values.reduce((prev, curr) => prev + curr, 0) / (values.length || 1);

      metric.data = metric.data.map((matchValuePair) => {
        if (matchValuePair.value !== undefined) {
          matchValuePair.percentage = matchValuePair.value / metric.max;
        }
        return matchValuePair;
      });

      return metric;
    }
  }

  function switchMetric(params: Parameters<typeof getMetric>[0]) {
    selecting = false;
    scrollTo(0, 0);
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

    <div class="-m-1 -mx-3 flex items-end gap-3 overflow-x-auto p-1 px-3 text-center text-sm">
      {#each selectedMetric.data as { match, value, percentage }}
        {@const color = `rgb(var(--theme-color) / ${(percentage * 100).toFixed(2)}%)`}

        <div class="flex shrink-0 grow basis-8 flex-col">
          <div>{value ?? "_"}</div>
          <div
            class="shrink-0 {value !== undefined ? 'min-h-px' : ''}"
            style="background-color:{color};height:{percentage * 128}px"
          ></div>
          <Button
            onclick={() => {
              sessionStorage.setItem("rank-view", sessionStorage.getItem("metric-view") || "");
              goto(`#/comp/${pageData.compRecord.id}/match/${match}`);
            }}
            class="justify-center px-1"
          >
            {match}
          </Button>
        </div>
      {/each}
    </div>

    <div class="flex flex-wrap justify-between gap-x-6 gap-y-4 text-sm">
      <div class="flex flex-wrap gap-x-6 gap-y-3">
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

      <Anchor route="comp/{pageData.compRecord.id}/rank?{rankLinkParams}" class="self-start text-sm">
        <ChartBarBigIcon class="text-theme size-5" />
        View rank
      </Anchor>
    </div>
  {:else}
    {#each groupedRanks as group}
      <div class="flex flex-col gap-2">
        <div class="flex flex-col">
          <h2 class="text-sm">{group.survey.name}</h2>
          <span class="text-xs font-light">{group.category}</span>
        </div>

        <div class="flex flex-wrap gap-2 text-sm">
          {#each group.expressions || [] as expression}
            <Button onclick={() => (selectedMetric = switchMetric({ survey: group.survey, expression }))}>
              {expression.name}
            </Button>
          {/each}
          {#each group.fields || [] as field}
            <Button onclick={() => (selectedMetric = switchMetric({ survey: group.survey, field }))}>
              {field.detailedName}
            </Button>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
