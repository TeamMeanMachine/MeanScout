<script lang="ts">
  import type { Team } from "$lib";
  import type { Entry } from "$lib/entry";
  import { getFieldsWithDetails } from "$lib/field";
  import type { CompPageData } from "$lib/loaders/loadCompPageData";
  import type { Survey } from "$lib/survey";

  let {
    pageData,
    surveyRecord,
    team,
  }: {
    pageData: CompPageData;
    surveyRecord: Survey;
    team: Team;
  } = $props();

  const fieldRecords = pageData.fieldRecords.filter((field) => field.surveyId == surveyRecord.id);
  const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

  const entries = $derived(pageData.entryRecords.filter(filterEntries).toSorted(sortEntries));
  const someAbsent = $derived(entries.some((entry) => entry.type == "match" && entry.absent));

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

  function filterEntries(entry: Entry) {
    return entry.status != "draft" && entry.team == team.number && entry.surveyId == surveyRecord.id;
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
  <table class="border-separate border-spacing-0 text-center text-sm">
    <thead class="sticky top-0 z-10 w-full bg-neutral-800 align-bottom">
      {#if fieldsWithDetails.nested.length}
        <tr>
          {#if surveyRecord.type == "match"}
            <th
              rowspan="2"
              class="sticky left-0 z-10 border-r border-b border-neutral-700 bg-neutral-800 p-2 text-center align-bottom"
            >
              <span class="hidden @md:block">Match</span><span class="block @md:hidden">#</span>
            </th>
          {/if}

          {#if someAbsent}
            <td class="border-r border-neutral-700"></td>
          {/if}

          {#if surveyRecord.type == "match" && surveyRecord.tbaMetrics?.length}
            <td colspan={surveyRecord.tbaMetrics.length} class="px-1 pt-1 pb-0 text-center font-light"> TBA </td>
            <td class="border-r border-neutral-700"></td>
          {/if}

          {#each fieldsWithDetails.topLevel as topLevelField}
            {#if topLevelField.type == "group"}
              <th colspan={topLevelField.field.fieldIds.length} class="px-2 pt-1 pb-0 font-light">
                {topLevelField.field.name}
              </th>
            {/if}
            <td class="border-r border-neutral-700"></td>
          {/each}
        </tr>
      {/if}

      <tr>
        {#if surveyRecord.type == "match" && !fieldsWithDetails.nested.length}
          <th class="sticky left-0 z-10 border-b border-neutral-700 bg-neutral-800 p-2 text-center">
            <span class="hidden @md:block">Match</span><span class="block @md:hidden">#</span>
          </th>
        {/if}

        {#if someAbsent}
          <th class={["border-r border-b border-neutral-700 p-2", fieldsWithDetails.nested.length && "pt-0"]}>
            Absent
          </th>
        {/if}

        {#if surveyRecord.type == "match" && surveyRecord.tbaMetrics?.length}
          {#each surveyRecord.tbaMetrics as tbaMetric}
            <th class={["border-b border-neutral-700 p-2", fieldsWithDetails.nested.length && "pt-0"]}>
              {tbaMetric}
            </th>
          {/each}
          <td class="border-r border-b border-neutral-700"></td>
        {/if}

        {#each fieldsWithDetails.topLevel as topLevelField}
          {#if topLevelField.type == "group"}
            {@const nestedFields = topLevelField.field.fieldIds
              .map((id) => pageData.fieldRecords.find((f) => f.id == id && f.type != "group"))
              .filter((f) => f !== undefined)}

            {#each nestedFields as { name, type }}
              <th
                class={[
                  "border-b border-neutral-700 p-2",
                  fieldsWithDetails.nested.length && "pt-0",
                  type == "text" && "text-left",
                ]}
              >
                {name}
              </th>
            {/each}
            <td class="border-r border-b border-neutral-700"></td>
          {:else}
            <th
              class={[
                "border-r border-b border-neutral-700 p-2",
                fieldsWithDetails.nested.length && "pt-0",
                topLevelField.field.type == "text" && "text-left",
              ]}
            >
              {topLevelField.field.name}
            </th>
          {/if}
        {/each}
      </tr>
    </thead>

    <tbody>
      {#each entries as entry (entry.id)}
        <tr>
          {#if entry.type == "match"}
            <th class="sticky left-0 border-r border-b border-neutral-700 bg-neutral-800 p-2 text-center">
              {entry.match}
            </th>

            {#if someAbsent}
              <td
                colspan={entry.absent ? 1000 : 1}
                class={["border-r border-b border-neutral-800 p-2", entry.absent && "text-left"]}
              >
                {entry.absent || ""}
              </td>
            {/if}

            {#if surveyRecord.type == "match" && surveyRecord.tbaMetrics?.length && !entry.absent}
              {@const tbaMetrics = surveyRecord.tbaMetrics
                .map((metric) => entry.tbaMetrics?.find((m) => m.name == metric)?.value)
                .filter((m) => m !== undefined)}

              {#each tbaMetrics as value}
                <td class="border-b border-neutral-800 p-2">{value}</td>
              {/each}
              <td class="border-r border-b border-neutral-800"></td>
            {/if}
          {/if}

          {#if entry.type != "match" || !entry.absent}
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
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
