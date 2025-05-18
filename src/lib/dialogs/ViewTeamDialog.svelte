<script lang="ts">
  import { sessionStorageStore, type Team, type Value } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import type { Entry } from "$lib/entry";
  import { type GroupField, type SingleField } from "$lib/field";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";

  let {
    pageData,
    team,
  }: {
    pageData: PageData;
    team: Team;
  } = $props();

  const tab = sessionStorageStore<"data" | "text">("view-team-tab", "data");

  const entries = pageData.entryRecords.filter(filterEntries).toSorted(sortEntries);

  const someAbsent = entries.some((entry) => entry.type == "match" && entry.absent);

  function getValues(entry: Entry): (Value | Value[])[] {
    return pageData.fieldsWithDetails.topLevel
      .filter((f) => {
        return (
          (f.type == "single" && isFilteredField(f.field)) ||
          (f.type == "group" && groupContainsFilteredFields(f.field))
        );
      })
      .map((topLevelField) => {
        if (topLevelField.type == "group") {
          return topLevelField.field.fieldIds
            .map((id) => pageData.fieldsWithDetails.nested.find((f) => f.field.id == id && isFilteredField(f.field)))
            .filter((f) => f !== undefined)
            .map((f) => entry.values[f.valueIndex]);
        } else {
          return entry.values[topLevelField.valueIndex];
        }
      });
  }

  function filterEntries(entry: IDBRecord<Entry>) {
    return entry.status != "draft" && entry.team == team.number;
  }

  function sortEntries(a: IDBRecord<Entry>, b: IDBRecord<Entry>) {
    if (a.type != "match" || b.type != "match") {
      return 0;
    }

    return b.match - a.match;
  }

  function groupContainsFilteredFields(group: GroupField) {
    return pageData.fieldsWithDetails.nested.some(
      (f) => group.fieldIds.includes(f.field.id) && (f.field.type == "text") == ($tab == "text"),
    );
  }

  function isFilteredField(field: SingleField) {
    return (field.type == "text") == ($tab == "text");
  }
</script>

<div class="flex flex-col">
  <strong>Team {team.number}</strong>
  {#if team.name}
    <small class="font-light">{team.name}</small>
  {/if}
</div>

{#if entries.length}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "data")} class={$tab == "data" ? "font-bold" : "font-light"}>Data</Button>
    <Button onclick={() => ($tab = "text")} class={$tab == "text" ? "font-bold" : "font-light"}>Notes</Button>
  </div>

  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto">
    <table class="border-separate border-spacing-0 text-sm {$tab == 'text' ? 'text-left text-balance' : 'text-center'}">
      <thead class="sticky top-0 z-10 w-full bg-neutral-800">
        {#if pageData.fieldsWithDetails.nested.length}
          <tr>
            {#if pageData.surveyType == "match"}
              <th
                rowspan="2"
                class="sticky left-0 z-10 border-r border-b border-neutral-700 bg-neutral-800 p-2 text-center align-bottom"
              >
                Match
              </th>
            {/if}

            {#if $tab == "data" && someAbsent}
              <td class="border-r border-neutral-700"></td>
            {/if}

            {#if $tab == "data" && pageData.surveyType == "match" && pageData.surveyRecord.tbaMetrics?.length}
              <td colspan={pageData.surveyRecord.tbaMetrics.length} class="px-1 pt-1 pb-0 text-center font-light"
                >TBA</td
              >
              <td class="border-r border-neutral-700"></td>
            {/if}

            {#each pageData.fieldsWithDetails.topLevel as topLevelField}
              {#if topLevelField.type == "group" && groupContainsFilteredFields(topLevelField.field)}
                <th colspan={topLevelField.field.fieldIds.length} class="px-2 pt-1 pb-0 font-light">
                  {topLevelField.field.name}
                </th>
                <td class="border-r border-neutral-700"></td>
              {:else if topLevelField.type != "group" && isFilteredField(topLevelField.field)}
                <td class="border-r border-neutral-700"></td>
              {/if}
            {/each}
          </tr>
        {/if}

        <tr>
          {#if pageData.surveyType == "match" && !pageData.fieldsWithDetails.nested.length}
            <th class="sticky left-0 z-10 border-b border-neutral-700 bg-neutral-800 p-2 text-center">Match</th>
          {/if}

          {#if $tab == "data" && someAbsent}
            <th class="border-r border-b border-neutral-700 p-2">Absent</th>
          {/if}

          {#if $tab == "data" && pageData.surveyType == "match" && pageData.surveyRecord.tbaMetrics?.length}
            {#each pageData.surveyRecord.tbaMetrics as tbaMetric}
              <th class="border-b border-neutral-700 p-2">{tbaMetric}</th>
            {/each}
            <td class="border-r border-b border-neutral-700"></td>
          {/if}

          {#each pageData.fieldsWithDetails.topLevel as topLevelField}
            {#if topLevelField.field.type == "group" && groupContainsFilteredFields(topLevelField.field)}
              {@const nestedFields = topLevelField.field.fieldIds
                .map((id) => pageData.fieldRecords.find((f) => f.id == id && f.type != "group" && isFilteredField(f)))
                .filter((f) => f !== undefined)}

              {#each nestedFields as { name }}
                <th class="border-b border-neutral-700 p-2">{name}</th>
              {/each}
              <td class="border-r border-b border-neutral-700"></td>
            {:else if topLevelField.field.type != "group" && isFilteredField(topLevelField.field)}
              <th class="border-r border-b border-neutral-700 p-2">{topLevelField.field.name}</th>
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

              {#if $tab == "data" && someAbsent}
                <td class="border-r border-b border-neutral-800 p-2">{entry.absent || ""}</td>
              {/if}

              {#if $tab == "data" && pageData.surveyType == "match" && pageData.surveyRecord.tbaMetrics?.length && !entry.absent}
                {@const tbaMetrics = pageData.surveyRecord.tbaMetrics
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
                    <td class="border-b border-neutral-800 p-2">{value ? value : ""}</td>
                  {/each}
                  <td class="border-r border-neutral-800"></td>
                {:else}
                  <td class="border-r border-b border-neutral-800 p-2">{valueOrValues ? valueOrValues : ""}</td>
                {/if}
              {/each}
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
