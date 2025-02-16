<script lang="ts">
  import { getOrdinal, type TeamInfo } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import type { Entry, MatchEntry } from "$lib/entry";
  import { getDetailedNestedFields } from "$lib/field";
  import type { MatchSurvey } from "$lib/survey";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import ViewExpressionDialog from "./ViewExpressionDialog.svelte";
  import ViewPickListDialog from "./ViewPickListDialog.svelte";

  let {
    data,
    teamInfo,
    entriesByTeam,
  }: {
    data: PageData;
    teamInfo: TeamInfo;
    entriesByTeam: Record<string, IDBRecord<Entry>[]>;
  } = $props();

  let tab = $state<"ranks" | "raw-data" | "raw-text">(data.surveyType == "match" ? "ranks" : "raw-data");

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
</script>

<div class="flex flex-col">
  <span>Team {teamInfo.number}</span>
  {#if teamInfo.name}
    <small>{teamInfo.name}</small>
  {/if}
</div>

{#if entries.length}
  <div class="flex flex-wrap gap-2 text-sm">
    {#if data.surveyType == "match"}
      <Button onclick={() => (tab = "ranks")} class={tab == "ranks" ? "font-bold" : "font-light"}>Ranks</Button>
    {/if}
    <Button onclick={() => (tab = "raw-data")} class={tab == "raw-data" ? "font-bold" : "font-light"}>Raw Data</Button>
    <Button onclick={() => (tab = "raw-text")} class={tab == "raw-text" ? "font-bold" : "font-light"}>Raw Text</Button>
  </div>

  <div class="flex max-h-[500px] flex-col gap-2 overflow-auto">
    {#if tab == "ranks"}
      <div class="flex flex-col gap-2 p-1">
        {#if teamInfo.pickListRanks?.length && data.surveyType == "match"}
          <h2 class="font-bold">Pick Lists</h2>
          {#each teamInfo.pickListRanks as pickListRank, i}
            <Button
              onclick={() => {
                openDialog(ViewPickListDialog, {
                  surveyRecord: data.surveyRecord as IDBRecord<MatchSurvey>,
                  fields: data.fields,
                  entriesByTeam: entriesByTeam as Record<string, IDBRecord<MatchEntry>[]>,
                  pickList: data.surveyRecord.pickLists[i],
                });
              }}
            >
              <div class="flex flex-col">
                <small>{data.surveyRecord.pickLists[i].name}</small>
                <div class="text-base font-bold">
                  {pickListRank}<small class="font-normal">{getOrdinal(pickListRank)}</small>
                </div>
              </div>
            </Button>
          {/each}
        {/if}

        {#if teamInfo.expressionRanks?.length && data.surveyType == "match"}
          {@const surveyExpressionRanks = teamInfo.expressionRanks.filter(
            (_, i) => data.surveyRecord.expressions[i].scope == "survey",
          )}
          {@const surveyExpressions = data.surveyRecord.expressions.filter((e) => e.scope == "survey")}

          {#if surveyExpressionRanks.length}
            <h2 class="pt-2 font-bold">Survey Expressions</h2>
            {#each surveyExpressionRanks as expressionRank, i}
              <Button
                onclick={() => {
                  openDialog(ViewExpressionDialog, {
                    surveyRecord: data.surveyRecord,
                    fields: data.fields,
                    entriesByTeam: entriesByTeam as Record<string, IDBRecord<MatchEntry>[]>,
                    expression: surveyExpressions[i],
                  });
                }}
              >
                <div class="flex flex-col">
                  <small>{surveyExpressions[i].name}</small>
                  <div class="text-base font-bold">
                    {expressionRank}<small class="font-normal">{getOrdinal(expressionRank)}</small>
                  </div>
                </div>
              </Button>
            {/each}
          {/if}

          {@const entryExpressionRanks = teamInfo.expressionRanks.filter(
            (_, i) => data.surveyRecord.expressions[i].scope == "entry",
          )}
          {@const entryExpressions = data.surveyRecord.expressions.filter((e) => e.scope == "entry")}

          {#if entryExpressionRanks.length}
            <h2 class="pt-2 font-bold">Entry Expressions <small class="font-normal">(averages)</small></h2>
            {#each entryExpressionRanks as expressionRank, i}
              <Button
                onclick={() => {
                  openDialog(ViewExpressionDialog, {
                    surveyRecord: data.surveyRecord,
                    fields: data.fields,
                    entriesByTeam: entriesByTeam as Record<string, IDBRecord<MatchEntry>[]>,
                    expression: entryExpressions[i],
                  });
                }}
              >
                <div class="flex flex-col">
                  <small>{entryExpressions[i].name}</small>
                  <div class="text-base font-bold">
                    {expressionRank}<small class="font-normal">{getOrdinal(expressionRank)}</small>
                  </div>
                </div>
              </Button>
            {/each}
          {/if}
        {/if}
      </div>
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
