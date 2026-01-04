<script lang="ts">
  import { type Team } from "$lib";
  import type { CompPageData } from "$lib/comp";
  import type { Entry, PitEntry } from "$lib/entry";
  import { getFieldsWithDetails } from "$lib/field";
  import type { PitSurvey } from "$lib/survey";

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

  const fieldRecords = pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id);
  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  const entries = pageData.entryRecords.filter(filterEntries).toSorted(sortEntries);

  const someScout = entries.some((entry) => entry.scout);
  const someDraft = entries.some((entry) => entry.status == "draft");

  function getValues(entry: Entry) {
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

        {#if someDraft}
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
          <td class="border-t border-r border-neutral-700"></td>
        {/if}
      </tr>

      <tr>
        <td class="border-l border-neutral-700"></td>

        {#if someDraft}
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

        {#if someScout}
          <th class="border-r border-b border-neutral-700 p-2 text-left">Scout</th>
        {/if}
      </tr>
    </thead>

    <tbody>
      {#each entries as entry}
        <tr>
          <td class="border-l border-neutral-800"></td>

          {#if someDraft}
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

          {#if someScout}
            <td class="border-r border-b border-neutral-800 p-2 text-left">
              <div class="w-24 truncate">{entry.scout}</div>
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
