<script lang="ts">
  import { sessionStorageStore, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import type { Entry } from "$lib/entry";
  import { getDetailedNestedFields } from "$lib/field";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";

  let {
    data,
    team,
  }: {
    data: PageData;
    team: Team;
  } = $props();

  const tab = sessionStorageStore<"raw-data" | "raw-text">("view-team-tab", "raw-data");

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
</script>

<div class="flex flex-col">
  <span>Team {team.number}</span>
  {#if team.name}
    <small>{team.name}</small>
  {/if}
</div>

{#if entries.length}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "raw-data")} class={$tab == "raw-data" ? "font-bold" : "font-light"}>
      Raw Data
    </Button>
    <Button onclick={() => ($tab = "raw-text")} class={$tab == "raw-text" ? "font-bold" : "font-light"}>
      Raw Text
    </Button>
  </div>

  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto">
    {#if $tab == "raw-data"}
      <table class="text-sm">
        <thead class="sticky top-0 z-10 bg-neutral-800">
          <tr>
            {#if data.surveyType == "match"}
              <th class="sticky left-0 z-10 bg-neutral-800 p-2 text-center">Match</th>
            {/if}

            {#if someAbsent}
              <th class="p-2 text-center">Absent</th>
            {/if}

            {#if data.surveyType == "match" && data.surveyRecord.tbaMetrics?.length}
              {#each data.surveyRecord.tbaMetrics as tbaMetric}
                <th class="p-2 text-center">
                  <span class="font-light">TBA</span>
                  <div>{tbaMetric}</div>
                </th>
              {/each}
            {/if}

            {#each data.surveyRecord.fieldIds as fieldId}
              {@const fieldDetails = detailedFields.get(fieldId)}

              {#if fieldDetails?.type == "group"}
                {#each fieldDetails.field.fieldIds as innerFieldId}
                  {@const innerFieldDetails = detailedInnerFields.get(innerFieldId)}

                  {#if innerFieldDetails && innerFieldDetails.field.type != "text"}
                    <th class="p-2 text-center">
                      <span class="font-light">{fieldDetails.field.name}</span>
                      <div>{innerFieldDetails.field.name}</div>
                    </th>
                  {/if}
                {/each}
              {:else if fieldDetails && fieldDetails.field.type != "text"}
                <th class="p-2 text-center">{fieldDetails.field.name}</th>
              {/if}
            {/each}
          </tr>
        </thead>

        <tbody>
          {#each entries as entry (entry.id)}
            <tr>
              {#if entry.type == "match"}
                <th class="sticky left-0 bg-neutral-800 p-2 text-center">{entry.match}</th>
              {/if}

              {#if entry.type == "match" && someAbsent}
                <td class="p-2 text-center">{entry.absent}</td>
              {/if}

              {#if entry.type == "match" && data.surveyType == "match" && data.surveyRecord.tbaMetrics?.length}
                {#each data.surveyRecord.tbaMetrics as tbaMetricName}
                  {@const metric = entry.tbaMetrics?.find((m) => m.name == tbaMetricName)?.value}
                  {#if metric}
                    <td class="p-2 text-center">{metric}</td>
                  {/if}
                {/each}
              {/if}

              {#if entry.type != "match" || !entry.absent}
                {#each data.surveyRecord.fieldIds as fieldId}
                  {@const fieldDetails = detailedFields.get(fieldId)}

                  {#if fieldDetails?.type == "group"}
                    {#each fieldDetails.field.fieldIds as innerFieldId}
                      {@const innerFieldDetails = detailedInnerFields.get(innerFieldId)}

                      {#if innerFieldDetails && innerFieldDetails.field.type != "text"}
                        <td class="p-2 text-center">{entry.values[innerFieldDetails.valueIndex]}</td>
                      {/if}
                    {/each}
                  {:else if fieldDetails && fieldDetails.field.type != "text"}
                    <td class="p-2 text-center">{entry.values[fieldDetails.valueIndex]}</td>
                  {/if}
                {/each}
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    {:else if $tab == "raw-text"}
      <table class="text-sm">
        <thead class="sticky top-0 z-10 bg-neutral-800">
          <tr>
            {#if data.surveyType == "match"}
              <th class="p-2 text-center">Match</th>
            {/if}

            {#each data.surveyRecord.fieldIds as fieldId}
              {@const fieldDetails = detailedFields.get(fieldId)}

              {#if fieldDetails?.type == "group"}
                {#each fieldDetails.field.fieldIds as innerFieldId}
                  {@const innerFieldDetails = detailedInnerFields.get(innerFieldId)}

                  {#if innerFieldDetails?.field.type == "text"}
                    <th class="p-2 text-center">
                      <span class="font-light">{fieldDetails.field.name}</span>
                      <div>{innerFieldDetails.field.name}</div>
                    </th>
                  {/if}
                {/each}
              {:else if fieldDetails?.field.type == "text"}
                <th class="p-2 text-center">{fieldDetails.field.name}</th>
              {/if}
            {/each}
          </tr>
        </thead>

        <tbody>
          {#each entries as entry (entry.id)}
            <tr>
              {#if entry.type == "match"}
                <th class="sticky left-0 bg-neutral-800 p-2 text-center">{entry.match}</th>
              {/if}

              {#each data.surveyRecord.fieldIds as fieldId}
                {@const fieldDetails = detailedFields.get(fieldId)}

                {#if fieldDetails?.type == "group"}
                  {#each fieldDetails.field.fieldIds as innerFieldId}
                    {@const innerFieldDetails = detailedInnerFields.get(innerFieldId)}

                    {#if innerFieldDetails?.field.type == "text"}
                      <td class="p-2">"{entry.values[innerFieldDetails.valueIndex]}"</td>
                    {/if}
                  {/each}
                {:else if fieldDetails?.field.type == "text"}
                  <td class="p-2">"{entry.values[fieldDetails.valueIndex]}"</td>
                {/if}
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
{/if}
