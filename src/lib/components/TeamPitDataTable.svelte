<script lang="ts">
  import { type Team } from "#lib";
  import type { CompPageData } from "#lib/comp.ts";
  import type { Entry, PitEntry } from "#lib/entry.ts";
  import { getFieldsWithDetails } from "#lib/field.ts";
  import type { PitSurvey } from "#lib/survey.ts";

  let {
    pageData,
    surveyRecord,
    team,
  }: {
    pageData: CompPageData;
    surveyRecord: PitSurvey;
    team: Team;
  } = $props();

  const leftStickColumnName = "left-2";

  const fieldRecords = $derived(pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id));
  const fieldsWithDetails = $derived(getFieldsWithDetails(surveyRecord, fieldRecords));

  const entries = $derived(pageData.entryRecords.filter(filterEntries).toSorted(sortEntries));

  const any = $derived.by(() => {
    const any = { hasScout: false, hasScoutTeam: false, isDraft: false };

    for (const e of entries) {
      if (e.scout) any.hasScout = true;
      if (e.scoutTeam) any.hasScoutTeam = true;
      if (e.status == "draft") any.isDraft = true;
    }

    return any;
  });

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
    return entry.type == "pit" && entry.team == team.number && entry.surveyId == surveyRecord.id;
  }

  function sortEntries(a: PitEntry, b: PitEntry) {
    return (a.scout || "").localeCompare(b.scout || "");
  }
</script>

{#if !entries.length}
  <span class="sticky left-0 text-sm">No data available.</span>
{:else}
  <table class="border-separate border-spacing-0 text-center text-sm">
    <thead class="sticky top-0 z-10 w-full bg-neutral-800 align-bottom text-sm">
      <tr>
        <td class="border-t border-l border-neutral-700"></td>

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
        <td class="border-l border-neutral-700"></td>

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
      {#each entries as entry}
        <tr>
          <td class="border-l border-neutral-800"></td>

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
      {/each}
    </tbody>
  </table>
{/if}
