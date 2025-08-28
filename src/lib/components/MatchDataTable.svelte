<script lang="ts">
  import { goto } from "$app/navigation";
  import { type Match, type Value } from "$lib";
  import { getExpressionData } from "$lib/analysis";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { sortExpressions } from "$lib/expression";
  import { getFieldsWithDetails } from "$lib/field";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";
  import type { MatchSurvey } from "$lib/survey";
  import Button from "./Button.svelte";

  let {
    pageData,
    surveyRecord,
    match,
    show,
  }: {
    pageData: CompPageData;
    surveyRecord: MatchSurvey;
    match: Match & { extraTeams?: string[] };
    show: "expressions" | "raw";
  } = $props();

  const redAlliance = [match.red1, match.red2, match.red3].filter((team) => team);
  const blueAlliance = [match.blue1, match.blue2, match.blue3].filter((team) => team);
  const teams = [...redAlliance, ...blueAlliance, ...(match.extraTeams || [])];

  const sortedEntryExpressions = surveyRecord.expressions.filter((e) => e.scope == "entry").toSorted(sortExpressions);
  const entryExpressions = Object.groupBy(sortedEntryExpressions, (e) => {
    if (e.input.from == "expressions") return "derived";
    if (e.input.from == "tba") return "tba";
    if (e.input.from == "fields") return "primitive";
    return "";
  });

  const leftStickColumnName = "left-15";

  const fieldRecords = pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id);
  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  const entries = pageData.entryRecords.filter(filterEntries).toSorted(sortEntries);

  const someScout = entries.some((entry) => entry.scout);
  const someDraft = entries.some((entry) => entry.status == "draft");
  const someAbsent = entries.some((entry) => entry.absent);

  function getExpressionValuesOfEntry(entry: MatchEntry) {
    const values: Record<string, Value> = {};

    for (const expression of sortedEntryExpressions) {
      const value = getExpressionData(
        pageData.compRecord,
        expression.name,
        surveyRecord,
        { [entry.team]: [entry] },
        fieldsWithDetails.orderedSingle,
      )?.data[0].value;

      if (value) {
        values[expression.name] = value;
      }
    }

    return values;
  }

  function getRawValuesOfEntries(entries: Entry[]) {
    return fieldsWithDetails.topLevel.map((topLevelField) => {
      if (topLevelField.type == "group") {
        return topLevelField.field.fieldIds
          .map((id) => fieldsWithDetails.nested.find((f) => f.field.id == id))
          .filter((f) => f !== undefined)
          .map((f) => ({ type: f.field.type, values: entries.map((entry) => entry.values[f.valueIndex]) }));
      } else {
        return {
          type: topLevelField.field.type,
          values: entries.map((entry) => entry.values[topLevelField.valueIndex]),
        };
      }
    });
  }

  function filterEntries(entry: Entry): entry is MatchEntry {
    return entry.type == "match" && entry.match == match.number && entry.surveyId == surveyRecord.id;
  }

  function sortEntries(a: MatchEntry, b: MatchEntry) {
    const targetA = teams.findIndex((t) => t == a.team);
    const targetB = teams.findIndex((t) => t == b.team);
    return targetA - targetB || b.match - a.match;
  }
</script>

{#if !entries.length}
  <span class="sticky left-0 text-sm">No data available.</span>
{:else}
  <table class="border-separate border-spacing-0 text-center max-md:text-sm">
    <thead class="sticky top-0 z-10 w-full bg-neutral-800 align-bottom text-sm">
      <tr>
        <th
          rowspan="2"
          class="sticky left-0 z-10 border-r border-b border-neutral-700 bg-neutral-800 p-2 text-center align-bottom"
        >
          Team
        </th>

        {#if show == "raw" && someScout}
          <td class="border-r border-neutral-700"></td>
        {/if}

        {#if someDraft}
          <td class="border-r border-neutral-700"></td>
        {/if}

        {#if someAbsent}
          <td class="border-r border-neutral-700"></td>
        {/if}

        {#if show == "expressions"}
          {#each ["derived", "tba", "primitive"] as const as input}
            {#if entryExpressions[input]?.length}
              <th colspan={entryExpressions[input]?.length} class="px-2 pt-1 pb-0 text-center font-light">
                <div class="sticky right-2 {leftStickColumnName} inline">
                  From
                  {#if input == "derived"}
                    expressions
                  {:else if input == "tba"}
                    TBA
                  {:else if input == "primitive"}
                    fields
                  {/if}
                </div>
              </th>
              <td class="border-r border-neutral-700"></td>
            {/if}
          {/each}
        {:else}
          {#if surveyRecord.tbaMetrics?.length}
            <th colspan={surveyRecord.tbaMetrics.length} class="px-2 pt-1 pb-0 text-center font-light">
              <div class="sticky right-2 {leftStickColumnName} inline">TBA</div>
            </th>
            <td class="border-r border-neutral-700"></td>
          {/if}

          {#each fieldsWithDetails.topLevel as topLevelField}
            {#if topLevelField.type == "group"}
              <th colspan={topLevelField.field.fieldIds.length} class="px-2 pt-1 pb-0 font-light">
                <div class="sticky right-2 {leftStickColumnName} inline">{topLevelField.field.name}</div>
              </th>
            {/if}
            <td class="border-r border-neutral-700"></td>
          {/each}
        {/if}
      </tr>

      <tr>
        {#if show == "raw"}
          {#if !fieldsWithDetails.nested.length}
            <th class="sticky left-0 z-10 border-b border-neutral-700 bg-neutral-800 p-2 text-center">Team</th>
          {/if}

          {#if someScout}
            <th class="border-r border-b border-neutral-700 p-2 text-left">Scout</th>
          {/if}
        {/if}

        {#if someDraft}
          <th class="border-r border-b border-neutral-700 p-2">Draft</th>
        {/if}

        {#if someAbsent}
          <th class="border-r border-b border-neutral-700 p-2">Absent</th>
        {/if}

        {#if show == "expressions"}
          {#each ["derived", "tba", "primitive"] as const as input}
            {#if entryExpressions[input]?.length}
              {#each entryExpressions[input] as entryExpression}
                <th class="border-b border-neutral-700 p-1">
                  <Button
                    onclick={() => {
                      sessionStorage.setItem("analysis-view", `${surveyRecord.id}-expression-${entryExpression.name}`);
                      goto(`#/comp/${pageData.compRecord.id}/analysis`);
                    }}
                    class="justify-center p-1! text-center!"
                  >
                    {entryExpression.name}
                  </Button>
                </th>
              {/each}
              <td class="border-r border-b border-neutral-700"></td>
            {/if}
          {/each}
        {:else}
          {#if surveyRecord.tbaMetrics?.length}
            {#each surveyRecord.tbaMetrics as tbaMetric}
              <th class="border-b border-neutral-700 p-2">{tbaMetric}</th>
            {/each}
            <td class="border-r border-b border-neutral-700"></td>
          {/if}

          {#each fieldsWithDetails.topLevel as topLevelField}
            {#if topLevelField.type == "group"}
              {@const nestedFields = topLevelField.field.fieldIds
                .map((id) => fieldRecords.find((f) => f.id == id && f.type != "group"))
                .filter((f) => f !== undefined)}

              {#each nestedFields as { name, type }}
                <th class={["border-b border-neutral-700 p-2 text-nowrap", type == "text" && "text-left"]}>
                  <div class={[type == "text" && `sticky ${leftStickColumnName} inline`]}>{name}</div>
                </th>
              {/each}
              <td class="border-r border-b border-neutral-700"></td>
            {:else}
              <th
                class={[
                  "border-r border-b border-neutral-700 p-2 text-nowrap",
                  topLevelField.field.type == "text" && "text-left",
                ]}
              >
                <div class={[topLevelField.field.type == "text" && `sticky ${leftStickColumnName} inline`]}>
                  {topLevelField.field.name}
                </div>
              </th>
            {/if}
          {/each}
        {/if}
      </tr>
    </thead>

    <tbody>
      {#each redAlliance as team}
        {@render teamRow(team, "text-red")}
      {/each}
      {#each blueAlliance as team}
        {@render teamRow(team, "text-blue")}
      {/each}
      {#each match.extraTeams || [] as team}
        {@render teamRow(team, "")}
      {/each}
    </tbody>
  </table>
{/if}

{#snippet teamRow(team: string, color: string)}
  {@const teamEntries = entries.filter((entry) => entry.team == team)}
  {@const emptySpace = teamEntries.length > 1 ? "-" : ""}

  <tr>
    <th class="sticky left-0 border-r border-b border-neutral-700 bg-neutral-800 p-1 text-sm">
      <Button
        onclick={() => {
          sessionStorage.setItem("team-view", team);
          goto(`#/comp/${pageData.compRecord.id}/teams`);
        }}
        class="w-13 {color} justify-center py-1.5"
      >
        {team}
      </Button>
    </th>

    {#if show == "raw" && someScout}
      <td class="border-r border-b border-neutral-800 p-2 text-left">
        <div class="w-24">
          {#each teamEntries as entry}
            <div class="truncate">{entry.scout}</div>
          {/each}
        </div>
      </td>
    {/if}

    {#if someDraft}
      <td class="border-r border-b border-neutral-800 p-2">
        {#each teamEntries as entry}
          <div>{entry.status == "draft" ? "true" : emptySpace}</div>
        {/each}
      </td>
    {/if}

    {#if someAbsent}
      <td class="border-r border-b border-neutral-800 p-2 text-left">
        {#each teamEntries as entry}
          <div>{entry.absent ? "true" : emptySpace}</div>
        {/each}
      </td>
    {/if}

    {#if show == "expressions"}
      {@const expressionValuesOfEntries = teamEntries.map((entry) => getExpressionValuesOfEntry(entry))}

      {#each ["derived", "tba", "primitive"] as const as input}
        {#if entryExpressions[input]?.length}
          {#each entryExpressions[input] as entryExpression}
            <td class="border-b border-neutral-800 p-2">
              {#each expressionValuesOfEntries as expressionValuesForEntry}
                {@const value = expressionValuesForEntry[entryExpression.name]}
                <div>{value || emptySpace}</div>
              {/each}
            </td>
          {/each}
          <td class="border-r border-neutral-800"></td>
        {/if}
      {/each}
    {:else}
      {#if surveyRecord.tbaMetrics?.length}
        {#each surveyRecord.tbaMetrics as metric}
          <td class="border-b border-neutral-800 p-2">
            {#each teamEntries as entry}
              {@const metricValue = entry.tbaMetrics?.find((m) => m.name == metric)?.value}
              <div>{metricValue || emptySpace}</div>
            {/each}
          </td>
        {/each}
        <td class="border-r border-b border-neutral-800"></td>
      {/if}

      {#each getRawValuesOfEntries(teamEntries) as valueOrValues}
        {#if Array.isArray(valueOrValues)}
          {#each valueOrValues as value}
            <td class={["border-b border-neutral-800 p-2", value.type == "text" && "min-w-xs text-left"]}>
              {#each value.values as val}
                <div>{val || emptySpace}</div>
              {/each}
            </td>
          {/each}
          <td class="border-r border-neutral-800"></td>
        {:else}
          <td
            class={["border-r border-b border-neutral-800 p-2", valueOrValues.type == "text" && "min-w-xs text-left"]}
          >
            {#each valueOrValues.values as val}
              <div>{val || emptySpace}</div>
            {/each}
          </td>
        {/if}
      {/each}
    {/if}
  </tr>
{/snippet}
