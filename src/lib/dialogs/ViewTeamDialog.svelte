<script lang="ts">
  import type { TeamInfo } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import type { Entry } from "$lib/entry";
  import { getDetailedNestedFields } from "$lib/field";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";

  let {
    data,
    teamInfo,
  }: {
    data: PageData;
    teamInfo: TeamInfo;
  } = $props();

  let tab = $state<"ranks" | "raw-data" | "raw-text">("ranks");

  const { detailedFields, detailedInnerFields } = getDetailedNestedFields(
    data.surveyRecord.fieldIds,
    data.fieldRecords,
  );

  let entries = data.entryRecords.filter(filterEntries).toSorted(sortEntries);

  const someAbsent = entries.some((entry) => entry.type == "match" && entry.absent);

  function filterEntries(entry: IDBRecord<Entry>) {
    return entry.status != "draft" && entry.team == teamInfo.number;
  }

  function sortEntries(a: IDBRecord<Entry>, b: IDBRecord<Entry>) {
    if (a.type != "match" || b.type != "match") {
      return 0;
    }

    return b.match - a.match;
  }

  function getOrdinal(n: number) {
    if (n % 10 == 1 && n % 100 != 11) return "st";
    if (n % 10 == 2 && n % 100 != 12) return "nd";
    if (n % 10 == 3 && n % 100 != 13) return "rd";
    return "th";
  }
</script>

<div class="flex flex-col">
  <span>Team {teamInfo.number}</span>
  {#if teamInfo.name}
    <small>{teamInfo.name}</small>
  {/if}
</div>

{#if entries.length}
  {#if data.surveyType == "match"}
    <div class="flex flex-wrap gap-2 text-sm">
      <Button onclick={() => (tab = "ranks")} class={tab == "ranks" ? "font-bold" : "font-light"}>Ranks</Button>
      <Button onclick={() => (tab = "raw-data")} class={tab == "raw-data" ? "font-bold" : "font-light"}>
        Raw Data
      </Button>
      <Button onclick={() => (tab = "raw-text")} class={tab == "raw-text" ? "font-bold" : "font-light"}>
        Raw Text
      </Button>
    </div>
  {/if}

  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto">
    {#if tab == "ranks"}
      <table class="w-full text-left">
        <tbody>
          {#if teamInfo.pickListRanks?.length && data.surveyType == "match"}
            <tr><th colspan="2" class="p-2">Pick Lists</th></tr>
            {#each teamInfo.pickListRanks as pickListRank, i}
              <tr>
                <td colspan="2" class="p-2">
                  <small>{data.surveyRecord.pickLists[i].name}</small>
                  <div class="font-bold">
                    {pickListRank}<small class="font-normal">{getOrdinal(pickListRank)}</small>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}

          {#if teamInfo.expressionRanks?.length && data.surveyType == "match"}
            {@const surveyExpressionRanks = teamInfo.expressionRanks.filter(
              (_, i) => data.surveyRecord.expressions[i].scope == "survey",
            )}
            {@const surveyExpressions = data.surveyRecord.expressions.filter((e) => e.scope == "survey")}

            {#if surveyExpressionRanks.length}
              <tr><td class="p-2"></td></tr>
              <tr><th colspan="2" class="p-2">Survey Expressions</th></tr>
              {#each surveyExpressionRanks as expressionRank, i}
                <tr>
                  <td colspan="2" class="p-2">
                    <small>{surveyExpressions[i].name}</small>
                    <div class="font-bold">
                      {expressionRank}<small class="font-normal">{getOrdinal(expressionRank)}</small>
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}

            {@const entryExpressionRanks = teamInfo.expressionRanks.filter(
              (_, i) => data.surveyRecord.expressions[i].scope == "entry",
            )}
            {@const entryExpressions = data.surveyRecord.expressions.filter((e) => e.scope == "entry")}

            {#if entryExpressionRanks.length}
              <tr><td class="p-2"></td></tr>
              <tr>
                <th colspan="2" class="p-2">
                  Entry Expressions
                  <small class="font-normal">(Averages)</small>
                </th>
              </tr>
              {#each entryExpressionRanks as expressionRank, i}
                <tr>
                  <td colspan="2" class="p-2">
                    <small>{entryExpressions[i].name}</small>
                    <div class="font-bold">
                      {expressionRank}<small class="font-normal">{getOrdinal(expressionRank)}</small>
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          {/if}
        </tbody>
      </table>
    {:else if tab == "raw-data"}
      <table class="text-sm">
        <thead class="sticky top-0 z-10 bg-neutral-800">
          <tr>
            {#if data.surveyType == "match"}
              <th class="sticky left-0 z-10 bg-neutral-800 p-2 text-center">Match</th>
            {/if}

            {#if someAbsent}
              <th class="p-2 text-center">Absent</th>
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
    {:else if tab == "raw-text"}
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
