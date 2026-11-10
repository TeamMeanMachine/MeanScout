<script lang="ts">
  import type { CompPageData } from "#lib/comp.ts";
  import Anchor from "#lib/components/Anchor.svelte";
  import type { Entry, PitEntry } from "#lib/entry.ts";
  import { getFieldsWithDetails } from "#lib/field.ts";
  import { type Match } from "#lib/match.ts";
  import type { PitSurvey } from "#lib/survey.ts";

  let {
    pageData,
    surveyRecord,
    match,
  }: {
    pageData: CompPageData;
    surveyRecord: PitSurvey;
    match: Match & { extraTeams?: string[] };
  } = $props();

  const leftStickColumnName = "left-16";

  const redAlliance = $derived([match.red1, match.red2, match.red3].filter((team) => team));
  const blueAlliance = $derived([match.blue1, match.blue2, match.blue3].filter((team) => team));
  const teams = $derived([...redAlliance, ...blueAlliance, ...(match.extraTeams || [])]);

  const fieldRecords = $derived(pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id));
  const fieldsWithDetails = $derived(getFieldsWithDetails(surveyRecord, fieldRecords));

  const entries = $derived(pageData.entryRecords.filter(filterEntries));

  const any = $derived.by(() => {
    const any = { hasScout: false, hasScoutTeam: false, isDraft: false };

    for (const e of entries) {
      if (e.scout) any.hasScout = true;
      if (e.scoutTeam) any.hasScoutTeam = true;
      if (e.status == "draft") any.isDraft = true;
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

  function getValues(entry: Entry) {
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

  function filterEntries(entry: Entry): entry is PitEntry {
    return entry.type == "pit" && teams.includes(entry.team) && entry.surveyId == surveyRecord.id;
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
          <th colspan={1 + (any.hasScoutTeam ? 1 : 0)} class="border-t border-neutral-700 px-2 pt-1 pb-0 font-light">
            <div class="sticky right-0 {leftStickColumnName} inline">Scout</div>
          </th>
          <td class="border-t border-r border-neutral-700"></td>
        {/if}
      </tr>

      <tr>
        {#if any.isDraft}
          <th class="border-r border-b border-neutral-700 p-2">Draft</th>
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

        {#if any.hasScout}
          <th class="border-b border-neutral-700 p-2 text-left">Name</th>

          {#if any.hasScoutTeam}
            <th class="border-b border-neutral-700 p-2">Team</th>
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
              <td class="border-r border-b border-neutral-800 p-2 capitalize">
                {entry.status == "draft" ? "true" : ""}
              </td>
            {/if}

            {#each getValues(entry) as valueOrValues}
              {#if Array.isArray(valueOrValues)}
                {#each valueOrValues as value}
                  <td class={["border-b border-neutral-800 p-2", value.type == "text" && "min-w-xs text-left"]}>
                    {value.value ? value.value : ""}
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
                  {valueOrValues.value ? valueOrValues.value : ""}
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
              <td class="border-b border-neutral-800 p-2"></td>

              {#if any.hasScoutTeam}
                <td class="border-b border-neutral-800 p-2"></td>
              {/if}
              <td class="border-r border-neutral-800"></td>
            {/if}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
{/if}
