<script lang="ts">
  import { compareMatches, type Match, type Value } from "$lib";
  import type { CompPageData } from "$lib/comp";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { sortExpressions } from "$lib/expression";
  import { getFieldsWithDetails } from "$lib/field";
  import { getExpressionData } from "$lib/rank";
  import type { MatchSurvey } from "$lib/survey";
  import Anchor from "./Anchor.svelte";

  let {
    pageData,
    surveyRecord,
    match,
  }: {
    pageData: CompPageData;
    surveyRecord: MatchSurvey;
    match: Match & { extraTeams?: string[] };
  } = $props();

  const redAlliance = [match.red1, match.red2, match.red3].filter((team) => team);
  const blueAlliance = [match.blue1, match.blue2, match.blue3].filter((team) => team);
  const teams = [...redAlliance, ...blueAlliance, ...(match.extraTeams || [])];

  const entryExpressions = surveyRecord.expressions.filter((e) => e.scope == "entry").toSorted(sortExpressions);

  const leftStickColumnName = "left-16";

  const fieldRecords = pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id);
  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  const entries = pageData.entryRecords.filter(filterEntries);

  const entriesPerTeam = [...new Set([...entries.map((e) => e.team), ...teams])]
    .toSorted((a, b) => teams.findIndex((t) => t == a) - teams.findIndex((t) => t == b) || a.localeCompare(b))
    .map((team) => ({
      team,
      color: redAlliance.includes(team) ? "text-red" : blueAlliance.includes(team) ? "text-blue" : "",
      entries: entries
        .filter((entry) => entry.team == team)
        .toSorted((a, b) => (a.scout || "").localeCompare(b.scout || "")),
    }));

  const someScout = entries.some((entry) => entry.scout);
  const someScoutTeam = entries.some((entry) => entry.scoutTeam);
  const someDraft = entries.some((entry) => entry.status == "draft");
  const someAbsent = entries.some((entry) => entry.absent);

  const somePrediction = entries.some((entry) => entry.prediction);
  const somePredictionReason = entries.some((entry) => entry.predictionReason);

  function getExpressionValues(entry: MatchEntry) {
    const values: Record<string, Value> = {};

    for (const expression of entryExpressions) {
      const value = getExpressionData(
        pageData.compRecord,
        expression,
        surveyRecord,
        { [entry.team]: [entry] },
        fieldsWithDetails.orderedSingle,
      )?.teams[0].value;

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
    if (entry.type != "match" || entry.surveyId != surveyRecord.id) return false;
    return compareMatches(entry, match) == 0;
  }
</script>

{#if !entriesPerTeam.length}
  <span class="sticky left-0 text-sm">No data available.</span>
{:else}
  <table class="border-separate border-spacing-0 text-center text-sm">
    <thead class="sticky top-0 z-10 w-full bg-neutral-800 align-bottom text-sm">
      <tr>
        <th
          rowspan="2"
          class="sticky left-0 z-10 border border-neutral-700 bg-neutral-800 p-2 text-center align-bottom"
        >
          Team
        </th>

        {#if someDraft}
          <td class="border-t border-r border-neutral-700"></td>
        {/if}

        {#if someAbsent}
          <td class="border-t border-r border-neutral-700"></td>
        {/if}

        {#if entryExpressions.length}
          <th
            colspan={entryExpressions.length}
            class="border-t border-neutral-700 px-2 pt-1 pb-0 text-center font-light"
          >
            <div class="sticky right-0 {leftStickColumnName} inline">Expressions</div>
          </th>
          <td class="border-t border-r border-neutral-700"></td>
        {/if}

        {#if surveyRecord.tbaMetrics?.length}
          <th
            colspan={surveyRecord.tbaMetrics.length}
            class="border-t border-neutral-700 px-2 pt-1 pb-0 text-center font-light"
          >
            <div class="sticky right-0 {leftStickColumnName} inline">TBA</div>
          </th>
          <td class="border-t border-r border-neutral-700"></td>
        {/if}

        {#each fieldsWithDetails.topLevel as topLevelField}
          {#if topLevelField.type == "group"}
            <th
              colspan={topLevelField.field.fieldIds.length}
              class="border-t border-neutral-700 px-2 pt-1 pb-0 font-light"
            >
              <div class="sticky right-0 {leftStickColumnName} inline">{topLevelField.field.name}</div>
            </th>
          {/if}
          <td class="border-t border-r border-neutral-700"></td>
        {/each}

        {#if someScout}
          <th
            colspan={1 + (someScoutTeam ? 1 : 0) + (somePrediction ? 1 : 0) + (somePredictionReason ? 1 : 0)}
            class="border-t border-neutral-700 px-2 pt-1 pb-0 font-light"
          >
            <div class="sticky right-0 {leftStickColumnName} inline">Scout</div>
          </th>
          <td class="border-t border-r border-neutral-700"></td>
        {/if}
      </tr>

      <tr>
        {#if someDraft}
          <th class="border-r border-b border-neutral-700 p-2">Draft</th>
        {/if}

        {#if someAbsent}
          <th class="border-r border-b border-neutral-700 p-2">Absent</th>
        {/if}

        {#if entryExpressions.length}
          {#each entryExpressions as entryExpression}
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

            {#each nestedFields as { name, id, type }}
              <th class={["border-b border-neutral-700 p-1 text-nowrap", type == "text" && "p-2 text-left"]}>
                {#if type == "text"}
                  <div class="sticky {leftStickColumnName} inline">{name}</div>
                {:else}
                  <Anchor
                    route="comp/{pageData.compRecord.id}/rank?surveyId={encodeURIComponent(
                      surveyRecord.id,
                    )}&field={encodeURIComponent(id)}"
                    class="justify-center p-1! text-center!"
                  >
                    {name}
                  </Anchor>
                {/if}
              </th>
            {/each}
            <td class="border-r border-b border-neutral-700"></td>
          {:else}
            <th
              class={[
                "border-r border-b border-neutral-700 p-1 text-nowrap",
                topLevelField.field.type == "text" && "p-2 text-left",
              ]}
            >
              {#if topLevelField.field.type == "text"}
                <div class="sticky ${leftStickColumnName} inline">
                  {topLevelField.field.name}
                </div>
              {:else}
                <Anchor
                  route="comp/{pageData.compRecord.id}/rank?surveyId={encodeURIComponent(
                    surveyRecord.id,
                  )}&field={encodeURIComponent(topLevelField.field.id)}"
                  class="justify-center p-1! text-center!"
                >
                  {topLevelField.field.name}
                </Anchor>
              {/if}
            </th>
          {/if}
        {/each}

        {#if someScout}
          <th class="border-b border-neutral-700 p-2 text-left">Name</th>

          {#if someScoutTeam}
            <th class="border-b border-neutral-700 p-2">Team</th>
          {/if}

          {#if somePrediction}
            <th class="border-b border-neutral-700 p-2 text-left">Guess</th>

            {#if somePredictionReason}
              <th class="border-b border-neutral-700 p-2 text-left">
                <div class="sticky {leftStickColumnName} inline">Reason</div>
              </th>
            {/if}
          {/if}

          <td class="border-r border-b border-neutral-700"></td>
        {/if}
      </tr>
    </thead>

    <tbody>
      {#each entriesPerTeam as { team, color, entries }}
        {#each entries as entry}
          <tr>
            <th class="sticky left-0 border-x border-b border-neutral-700 bg-neutral-800 p-1 text-sm">
              <Anchor route="comp/{pageData.compRecord.id}/teams/{team}" class="w-13 {color} justify-center py-1.5">
                {team}
              </Anchor>
            </th>

            {#if someDraft}
              <td class="border-r border-b border-neutral-800 p-2">
                <div>{entry.status == "draft" ? "true" : ""}</div>
              </td>
            {/if}

            {#if someAbsent}
              <td class="border-r border-b border-neutral-800 p-2 text-left">
                <div>{entry.absent ? "true" : ""}</div>
              </td>
            {/if}

            {#if entryExpressions.length}
              {@const values = getExpressionValues(entry)}
              {#each entryExpressions as entryExpression}
                {@const value = values[entryExpression.name]}
                <td class="border-b border-neutral-800 p-2">{(!entry.absent && value) || ""}</td>
              {/each}
              <td class="border-r border-neutral-800"></td>
            {/if}

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

            {#if someScout}
              <td class="border-b border-neutral-800 p-2 text-left">
                <div class="w-24 truncate">{entry.scout}</div>
              </td>

              {#if someScoutTeam}
                <td class="border-b border-neutral-800 p-2">{entry.scoutTeam}</td>
              {/if}

              {#if somePrediction}
                <td class="border-b border-neutral-800 p-2 capitalize">
                  <div class={entry.prediction == "red" ? "text-red" : entry.prediction == "blue" ? "text-blue" : ""}>
                    {entry.prediction}
                  </div>
                </td>

                {#if somePredictionReason}
                  <td class="min-w-xs border-b border-neutral-800 p-2 text-left">
                    {entry.predictionReason}
                  </td>
                {/if}
              {/if}
              <td class="border-r border-neutral-800"></td>
            {/if}
          </tr>
        {:else}
          <tr>
            <th class="sticky left-0 border-x border-b border-neutral-700 bg-neutral-800 p-1 text-sm">
              <Anchor
                route="comp/{pageData.compRecord.id}/teams/{team}"
                class="w-13 {color} justify-center py-1.5 font-light"
              >
                {team}
              </Anchor>
            </th>

            {#if someDraft}
              <td class="border-r border-b border-neutral-800 p-2"></td>
            {/if}

            {#if someAbsent}
              <td class="border-r border-b border-neutral-800 p-2"></td>
            {/if}

            {#if entryExpressions.length}
              {#each entryExpressions}
                <td class="border-b border-neutral-800 p-2"></td>
              {/each}
              <td class="border-r border-neutral-800"></td>
            {/if}

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

            {#if someScout}
              <td class="border-b border-neutral-800 p-2 text-left"></td>

              {#if someScoutTeam}
                <td class="border-b border-neutral-800 p-2"></td>
              {/if}

              {#if somePrediction}
                <td class="border-b border-neutral-800 p-2 text-left"></td>

                {#if somePredictionReason}
                  <td class="border-b border-neutral-800 p-2 text-left"></td>
                {/if}
              {/if}

              <td class="border-r border-b border-neutral-800"></td>
            {/if}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
{/if}
