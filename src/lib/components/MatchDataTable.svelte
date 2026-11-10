<script lang="ts">
  import { type Value } from "#lib";
  import type { CompPageData } from "#lib/comp.ts";
  import Anchor from "#lib/components/Anchor.svelte";
  import type { Entry, MatchEntry } from "#lib/entry.ts";
  import { sortExpressions } from "#lib/expression.ts";
  import { getFieldsWithDetails } from "#lib/field.ts";
  import { compareMatches, type Match } from "#lib/match.ts";
  import { getExpressionData } from "#lib/rank.ts";
  import type { MatchSurvey } from "#lib/survey.ts";

  let {
    pageData,
    surveyRecord,
    match,
  }: {
    pageData: CompPageData;
    surveyRecord: MatchSurvey;
    match: Match & { extraTeams?: string[] };
  } = $props();

  const leftStickColumnName = "left-16";

  const redAlliance = $derived([match.red1, match.red2, match.red3].filter((team) => team));
  const blueAlliance = $derived([match.blue1, match.blue2, match.blue3].filter((team) => team));
  const teams = $derived([...redAlliance, ...blueAlliance, ...(match.extraTeams || [])]);

  const entryExpressions = $derived(
    surveyRecord.expressions.filter((e) => e.scope == "entry").toSorted(sortExpressions),
  );

  const fieldRecords = $derived(pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id));
  const fieldsWithDetails = $derived(getFieldsWithDetails(surveyRecord, fieldRecords));

  const entries = $derived(pageData.entryRecords.filter(filterEntries));

  const any = $derived.by(() => {
    const any = {
      hasScout: false,
      hasScoutTeam: false,
      isDraft: false,
      isAbsent: false,
      hasPrediction: false,
      hasPredictionReason: false,
    };

    for (const e of entries) {
      if (e.scout) any.hasScout = true;
      if (e.scoutTeam) any.hasScoutTeam = true;
      if (e.status == "draft") any.isDraft = true;
      if (e.absent) any.isAbsent = true;
      if (e.prediction) any.hasPrediction = true;
      if (e.predictionReason) any.hasPredictionReason = true;
    }

    return any;
  });

  const entriesPerTeam = $derived(
    [...new Set([...entries.map((e) => e.team), ...teams])]
      .toSorted((a, b) => teams.findIndex((t) => t == a) - teams.findIndex((t) => t == b) || a.localeCompare(b))
      .map((team) => ({
        team,
        color: redAlliance.includes(team) ? "text-red" : blueAlliance.includes(team) ? "text-blue" : "",
        entries: entries
          .filter((entry) => entry.team == team)
          .toSorted((a, b) => (a.scout || "").localeCompare(b.scout || "")),
      })),
  );

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

      if (value) values[expression.name] = value;
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
      }

      return { type: topLevelField.field.type, value: entry.values[topLevelField.valueIndex] };
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

        {#if any.isDraft}
          <td class="border-t border-r border-neutral-700"></td>
        {/if}

        {#if any.isAbsent}
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

        {#if any.hasScout}
          <th
            colspan={1 + (any.hasScoutTeam ? 1 : 0) + (any.hasPrediction ? 1 : 0) + (any.hasPredictionReason ? 1 : 0)}
            class="border-t border-neutral-700 px-2 pt-1 pb-0 font-light"
          >
            <div class="sticky right-0 {leftStickColumnName} inline">Scout</div>
          </th>
          <td class="border-t border-r border-neutral-700"></td>
        {/if}
      </tr>

      <tr>
        {#if any.isDraft}
          <th class="border-r border-b border-neutral-700 p-2">Draft</th>
        {/if}

        {#if any.isAbsent}
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

        {#if any.hasScout}
          <th class="border-b border-neutral-700 p-2 text-left">Name</th>

          {#if any.hasScoutTeam}
            <th class="border-b border-neutral-700 p-2">Team</th>
          {/if}

          {#if any.hasPrediction}
            <th class="border-b border-neutral-700 p-2 text-left">Guess</th>

            {#if any.hasPredictionReason}
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

            {#if any.isDraft}
              <td class="border-r border-b border-neutral-800 p-2">
                <div>{entry.status == "draft" ? "true" : ""}</div>
              </td>
            {/if}

            {#if any.isAbsent}
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

            {#if any.hasScout}
              <td class="border-b border-neutral-800 p-2 text-left">
                <div class="w-24 truncate">{entry.scout}</div>
              </td>

              {#if any.hasScoutTeam}
                <td class="border-b border-neutral-800 p-2">{entry.scoutTeam}</td>
              {/if}

              {#if any.hasPrediction}
                <td class="border-b border-neutral-800 p-2 capitalize">
                  <div class={entry.prediction == "red" ? "text-red" : entry.prediction == "blue" ? "text-blue" : ""}>
                    {entry.prediction}
                  </div>
                </td>

                {#if any.hasPredictionReason}
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

            {#if any.isDraft}
              <td class="border-r border-b border-neutral-800 p-2"></td>
            {/if}

            {#if any.isAbsent}
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

            {#if any.hasScout}
              <td class="border-b border-neutral-800 p-2 text-left"></td>

              {#if any.hasScoutTeam}
                <td class="border-b border-neutral-800 p-2"></td>
              {/if}

              {#if any.hasPrediction}
                <td class="border-b border-neutral-800 p-2 text-left"></td>

                {#if any.hasPredictionReason}
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
