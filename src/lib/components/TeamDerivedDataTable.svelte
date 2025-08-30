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

  let {
    pageData,
    surveyRecord,
    team,
  }: {
    pageData: CompPageData;
    surveyRecord: MatchSurvey;
    team: Team;
  } = $props();

  const sortedEntryExpressions = surveyRecord.expressions.filter((e) => e.scope == "entry").toSorted(sortExpressions);
  const entryExpressions = Object.groupBy(sortedEntryExpressions, (e) => {
    if (e.input.from == "expressions") return "derived";
    if (e.input.from == "tba") return "tba";
    if (e.input.from == "fields") return "primitive";
    return "";
  });

  const leftStickColumnName = surveyRecord.type == "match" ? "left-11" : "left-2";

  const fieldRecords = pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id);
  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  const entries = pageData.entryRecords.filter(filterEntries).toSorted(sortEntries);

  const someDraft = entries.some((entry) => entry.status == "draft");
  const someAbsent = entries.some((entry) => entry.type == "match" && entry.absent);

  function getValues(entry: MatchEntry) {
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

  function filterEntries(entry: Entry): entry is MatchEntry {
    return entry.type == "match" && entry.team == team.number && entry.surveyId == surveyRecord.id;
  }

  function sortEntries(a: Entry, b: Entry) {
    if (a.type != "match" || b.type != "match") {
      return 0;
    }

    return b.match - a.match;
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
          #
        </th>

        {#if someDraft}
          <td class="border-r border-neutral-700"></td>
        {/if}

        {#if someAbsent}
          <td class="border-r border-neutral-700"></td>
        {/if}

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
      </tr>

      <tr>
        {#if someDraft}
          <th class="border-r border-b border-neutral-700 p-2">Draft</th>
        {/if}

        {#if someAbsent}
          <th class="border-r border-b border-neutral-700 p-2">Absent</th>
        {/if}

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
      </tr>
    </thead>

    <tbody>
      {#each entries as entry}
        <tr>
          <th class="sticky left-0 border-r border-b border-neutral-700 bg-neutral-800 p-1 text-sm">
            <Button
              onclick={() => {
                sessionStorage.setItem("match-view", entry.match.toString());
                goto(`#/comp/${pageData.compRecord.id}/matches`);
              }}
              class="w-full justify-center py-1.5"
            >
              {entry.match}
            </Button>
          </th>

          {#if someDraft}
            <td class="border-r border-b border-neutral-800 p-2">
              {entry.status == "draft" ? "true" : ""}
            </td>
          {/if}

          {#if someAbsent}
            <td
              colspan={entry.absent ? 1000 : 1}
              class={["border-r border-b border-neutral-800 p-2", entry.absent && "text-left"]}
            >
              {entry.absent || ""}
            </td>
          {/if}

          {#if !entry.absent}
            {@const values = getValues(entry)}
            {#each ["derived", "tba", "primitive"] as const as input}
              {#if entryExpressions[input]?.length}
                {#each entryExpressions[input] as entryExpression}
                  {@const value = values[entryExpression.name]}
                  <td class="border-b border-neutral-800 p-2">
                    {value ? value : ""}
                  </td>
                {/each}
                <td class="border-r border-neutral-800"></td>
              {/if}
            {/each}
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
