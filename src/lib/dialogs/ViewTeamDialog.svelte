<script lang="ts">
  import { sessionStorageStore, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import type { Entry } from "$lib/entry";
  import { getDetailedNestedFields, type GroupField, type SingleField } from "$lib/field";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";

  let {
    data,
    team,
  }: {
    data: PageData;
    team: Team;
  } = $props();

  const tab = sessionStorageStore<"data" | "text">("view-team-tab", "data");

  const { detailedFields, detailedInnerFields } = getDetailedNestedFields(
    data.surveyRecord.fieldIds,
    data.fieldRecords,
  );

  let entries = data.entryRecords.filter(filterEntries).toSorted(sortEntries);

  const someAbsent = entries.some((entry) => entry.type == "match" && entry.absent);

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
    return detailedInnerFields
      .values()
      .some((f) => group.fieldIds.includes(f.field.id) && (f.field.type == "text") == ($tab == "text"));
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
        {#if detailedInnerFields.size}
          <tr>
            {#if data.surveyType == "match"}
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

            {#if $tab == "data" && data.surveyType == "match" && data.surveyRecord.tbaMetrics?.length}
              <td colspan={data.surveyRecord.tbaMetrics.length} class="px-1 pt-1 pb-0 text-center font-light">TBA</td>
              <td class="border-r border-neutral-700"></td>
            {/if}

            {#each data.surveyRecord.fieldIds as fieldId}
              {@const fieldDetails = detailedFields.get(fieldId)!}

              {#if fieldDetails.type == "group" && groupContainsFilteredFields(fieldDetails.field)}
                <th colspan={fieldDetails.field.fieldIds.length} class="px-2 pt-1 pb-0 font-light">
                  {fieldDetails.field.name}
                </th>
                <td class="border-r border-neutral-700"></td>
              {:else if fieldDetails.type != "group" && isFilteredField(fieldDetails.field)}
                <td class="border-r border-neutral-700"></td>
              {/if}
            {/each}
          </tr>
        {/if}

        <tr>
          {#if data.surveyType == "match" && !detailedInnerFields.size}
            <th class="sticky left-0 z-10 border-b border-neutral-700 bg-neutral-800 p-2 text-center">Match</th>
          {/if}

          {#if $tab == "data" && someAbsent}
            <th class="border-r border-b border-neutral-700 p-2">Absent</th>
          {/if}

          {#if $tab == "data" && data.surveyType == "match" && data.surveyRecord.tbaMetrics?.length}
            {#each data.surveyRecord.tbaMetrics as tbaMetric}
              <th class="border-b border-neutral-700 p-2">{tbaMetric}</th>
            {/each}
            <td class="border-r border-b border-neutral-700"></td>
          {/if}

          {#each data.surveyRecord.fieldIds as fieldId}
            {@const fieldDetails = detailedFields.get(fieldId)!}

            {#if fieldDetails.type == "group" && groupContainsFilteredFields(fieldDetails.field)}
              {#each fieldDetails.field.fieldIds as innerFieldId}
                {@const innerFieldDetails = detailedInnerFields.get(innerFieldId)}

                {#if innerFieldDetails && isFilteredField(innerFieldDetails.field)}
                  <th class="border-b border-neutral-700 p-2">{innerFieldDetails.field.name}</th>
                {/if}
              {/each}
              <td class="border-r border-b border-neutral-700"></td>
            {:else if fieldDetails.type != "group" && isFilteredField(fieldDetails.field)}
              <th class="border-r border-b border-neutral-700 p-2">{fieldDetails.field.name}</th>
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

              {#if $tab == "data" && data.surveyType == "match" && data.surveyRecord.tbaMetrics?.length && !entry.absent}
                {#each data.surveyRecord.tbaMetrics as tbaMetricName}
                  {@const metric = entry.tbaMetrics?.find((m) => m.name == tbaMetricName)?.value}
                  {#if metric}
                    <td class="border-b border-neutral-800 p-2">{metric}</td>
                  {/if}
                {/each}
                <td class="border-r border-b border-neutral-800"></td>
              {/if}
            {/if}

            {#if entry.type != "match" || !entry.absent}
              {#each data.surveyRecord.fieldIds as fieldId}
                {@const fieldDetails = detailedFields.get(fieldId)!}

                {#if fieldDetails.type == "group" && groupContainsFilteredFields(fieldDetails.field)}
                  {#each fieldDetails.field.fieldIds as innerFieldId}
                    {@const innerFieldDetails = detailedInnerFields.get(innerFieldId)!}

                    {#if isFilteredField(innerFieldDetails.field)}
                      {@const value = entry.values[innerFieldDetails.valueIndex]}
                      <td class="border-b border-neutral-800 p-2">{value ? value : ""}</td>
                    {/if}
                  {/each}
                  <td class="border-r border-neutral-800"></td>
                {:else if fieldDetails.type != "group" && isFilteredField(fieldDetails.field)}
                  {@const value = entry.values[fieldDetails.valueIndex]}
                  <td class="border-r border-b border-neutral-800 p-2">{value ? value : ""}</td>
                {/if}
              {/each}
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
