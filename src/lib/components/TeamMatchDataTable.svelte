<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Team, Value } from "$lib";
  import { getExpressionData } from "$lib/analysis";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { sortExpressions } from "$lib/expression";
  import { getFieldsWithDetails } from "$lib/field";
  import type { CompPageData } from "$lib/comp";
  import type { MatchSurvey } from "$lib/survey";
  import Button from "./Button.svelte";
  import Anchor from "./Anchor.svelte";

  let {
    pageData,
    surveyRecord,
    team,
    show,
  }: {
    pageData: CompPageData;
    surveyRecord: MatchSurvey;
    team: Team;
    show: "expressions" | "raw";
  } = $props();

  const sortedEntryExpressions = surveyRecord.expressions.filter((e) => e.scope == "entry").toSorted(sortExpressions);
  const entryExpressions = Object.groupBy(sortedEntryExpressions, (e) => {
    if (e.input.from == "expressions") return "derived";
    if (e.input.from == "tba") return "tba";
    if (e.input.from == "fields") return "primitive";
    return "";
  });

  const leftStickColumnName = "left-16";

  const fieldRecords = pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id);
  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  const entries = pageData.entryRecords.filter(filterEntries);

  const matches = pageData.compRecord.matches.filter((m) =>
    [m.red1, m.red2, m.red3, m.blue1, m.blue2, m.blue3].includes(team.number),
  );

  const entriesPerMatch = [...new Set([...entries.map((e) => e.match), ...matches.map((m) => m.number)])]
    .toSorted((a, b) => b - a)
    .map((number) => ({
      number,
      entries: entries
        .filter((e) => e.match == number)
        .toSorted((a, b) => (a.scout || "").localeCompare(b.scout || "")),
    }));

  const someScout = entries.some((entry) => entry.scout);
  const someDraft = entries.some((entry) => entry.status == "draft");
  const someAbsent = entries.some((entry) => entry.absent);

  function getExpressionValues(entry: MatchEntry) {
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

  function getRawValues(entry: Entry) {
    return fieldsWithDetails.topLevel.map((topLevelField) => {
      if (topLevelField.type == "group") {
        return topLevelField.field.fieldIds
          .map((id) => fieldsWithDetails.nested.find((f) => f.field.id == id))
          .filter((f) => f !== undefined)
          .map((f) => ({ type: f.field.type, value: entry.values[f.valueIndex] }));
      } else {
        return { type: topLevelField.field.type, value: entry.values[topLevelField.valueIndex] };
      }
    });
  }

  function filterEntries(entry: Entry): entry is MatchEntry {
    return entry.type == "match" && entry.team == team.number && entry.surveyId == surveyRecord.id;
  }
</script>

{#if !entriesPerMatch.length}
  <span class="sticky left-0 text-sm">No data available.</span>
{:else}
  <table class="border-separate border-spacing-0 text-center max-md:text-sm">
    <thead class="sticky top-0 z-10 w-full bg-neutral-800 align-bottom text-sm">
      <tr>
        <th
          rowspan="2"
          class="sticky left-0 z-10 border-r border-b border-neutral-700 bg-neutral-800 p-2 text-center align-bottom"
        >
          #
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
        {#if show == "raw" && someScout}
          <th class="border-r border-b border-neutral-700 p-2 text-left">Scout</th>
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
                  <Anchor
                    route="comp/{pageData.compRecord.id}/rank?surveyId={encodeURIComponent(
                      surveyRecord.id,
                    )}&expression={encodeURIComponent(entryExpression.name)}"
                    class="justify-center p-1! text-center!"
                  >
                    {entryExpression.name}
                  </Anchor>
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
      {#each entriesPerMatch as { number, entries }}
        {#each entries as entry}
          <tr>
            <th class="sticky left-0 border-r border-b border-neutral-700 bg-neutral-800 p-1 text-sm">
              <Button
                onclick={() => {
                  sessionStorage.setItem("match-view-show-which", "data");
                  sessionStorage.setItem("match-view-show-data", "derived");
                  goto(`#/comp/${pageData.compRecord.id}/match/${number}`);
                }}
                class="w-13 justify-center py-1.5"
              >
                {number}
              </Button>
            </th>

            {#if show == "raw" && someScout}
              <td class="border-r border-b border-neutral-800 p-2 text-left">
                <div class="w-24 truncate">{entry.scout}</div>
              </td>
            {/if}

            {#if someDraft}
              <td class="border-r border-b border-neutral-800 p-2">
                {entry.status == "draft" ? "true" : ""}
              </td>
            {/if}

            {#if someAbsent}
              <td class="border-r border-b border-neutral-800 p-2 text-left">
                {entry.absent || ""}
              </td>
            {/if}

            {#if show == "expressions"}
              {@const values = getExpressionValues(entry)}
              {#each ["derived", "tba", "primitive"] as const as input}
                {#if entryExpressions[input]?.length}
                  {#each entryExpressions[input] as entryExpression}
                    {@const value = values[entryExpression.name]}
                    <td class="border-b border-neutral-800 p-2">
                      {(!entry.absent && value) || ""}
                    </td>
                  {/each}
                  <td class="border-r border-neutral-800"></td>
                {/if}
              {/each}
            {:else}
              {#if surveyRecord.tbaMetrics?.length}
                {@const tbaMetrics = surveyRecord.tbaMetrics.map(
                  (metric) => entry.tbaMetrics?.find((m) => m.name == metric)?.value,
                )}

                {#each tbaMetrics as value}
                  <td class="border-b border-neutral-800 p-2">{(!entry.absent && value) || ""}</td>
                {/each}
                <td class="border-r border-b border-neutral-800"></td>
              {/if}

              {#each getRawValues(entry) as valueOrValues}
                {#if Array.isArray(valueOrValues)}
                  {#each valueOrValues as value}
                    <td class={["border-b border-neutral-800 p-2", value.type == "text" && "min-w-xs text-left"]}>
                      {(!entry.absent && value.value) || ""}
                    </td>
                  {/each}
                  <td class="border-r border-neutral-800"></td>
                {:else}
                  <td
                    class={[
                      "border-r border-b border-neutral-800 p-2",
                      valueOrValues.type == "text" && "min-w-xs text-left",
                    ]}
                  >
                    {(!entry.absent && valueOrValues.value) || ""}
                  </td>
                {/if}
              {/each}
            {/if}
          </tr>
        {:else}
          <tr>
            <th class="sticky left-0 border-r border-b border-neutral-700 bg-neutral-800 p-1 text-sm">
              <Button
                onclick={() => {
                  sessionStorage.setItem("match-view-show-which", "data");
                  sessionStorage.setItem("match-view-show-data", "derived");
                  goto(`#/comp/${pageData.compRecord.id}/match/${number}`);
                }}
                class="w-13 justify-center py-1.5"
              >
                {number}
              </Button>
            </th>

            {#if show == "raw" && someScout}
              <td class="border-r border-b border-neutral-800 p-2 text-left"></td>
            {/if}

            {#if someDraft}
              <td class="border-r border-b border-neutral-800 p-2"></td>
            {/if}

            {#if someAbsent}
              <td class="border-r border-b border-neutral-800 p-2"></td>
            {/if}

            {#if show == "expressions"}
              {#each ["derived", "tba", "primitive"] as const as input}
                {#if entryExpressions[input]?.length}
                  {#each entryExpressions[input]}
                    <td class="border-b border-neutral-800 p-2"></td>
                  {/each}
                  <td class="border-r border-neutral-800"></td>
                {/if}
              {/each}
            {:else}
              {#if surveyRecord.tbaMetrics?.length}
                {#each surveyRecord.tbaMetrics}
                  <td class="border-b border-neutral-800 p-2"></td>
                {/each}
                <td class="border-r border-b border-neutral-800"></td>
              {/if}

              {#each fieldsWithDetails.topLevel as topLevelField}
                {#if topLevelField.type == "group"}
                  {@const nestedFields = topLevelField.field.fieldIds
                    .map((id) => fieldRecords.find((f) => f.id == id && f.type != "group"))
                    .filter((f) => f !== undefined)}

                  {#each nestedFields}
                    <td class="border-b border-neutral-800 p-2"></td>
                  {/each}
                  <td class="border-r border-b border-neutral-800"></td>
                {:else}
                  <td class="border-r border-b border-neutral-800 p-2"></td>
                {/if}
              {/each}
            {/if}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
{/if}
