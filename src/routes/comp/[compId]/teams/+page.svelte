<script lang="ts">
  import type { PageProps } from "./$types";
  import TeamEntryTable from "$lib/components/TeamEntryTable.svelte";
  import CompPageHeader from "../CompPageHeader.svelte";
  import type { Survey } from "$lib/survey";
  import type { Entry } from "$lib/entry";
  import type { SurveyPageData } from "$lib/loaders/loadSurveyPageData";
  import { getFieldsWithDetails } from "$lib/field";

  let { data }: PageProps = $props();

  let selectedString = $state(defaultSelectionString());

  let selected = $derived.by(() => {
    if (!selectedString) return defaultSelection();
    return data.teams.find((info) => info.number == selectedString);
  });

  $effect(() => {
    if (!selectedString) return;
    sessionStorage.setItem("team-view", selectedString);
  });

  function defaultSelectionString() {
    const value = sessionStorage.getItem("team-view");

    if (value && data.teams.some((info) => info.number == value)) {
      return value;
    }

    return defaultSelection()?.number || undefined;
  }

  function defaultSelection() {
    return data.teams.at(0);
  }

  function getSurveyPageData(surveyRecord: Survey): SurveyPageData {
    const entryRecords = data.entryRecords.filter((e) => e.surveyId == surveyRecord.id);
    const fieldRecords = data.fieldRecords.filter((field) => field.surveyId == surveyRecord.id);
    const fieldsWithDetails = getFieldsWithDetails(surveyRecord, fieldRecords);

    if (surveyRecord.type == "match") {
      return {
        all: data.all,
        compRecord: data.compRecord,
        fieldRecords,
        fieldsWithDetails,
        surveyType: "match",
        surveyRecord,
        entryRecords: entryRecords.filter((e) => e.type == "match"),
      };
    } else {
      return {
        all: data.all,
        compRecord: data.compRecord,
        fieldRecords,
        fieldsWithDetails,
        surveyType: "pit",
        surveyRecord,
        entryRecords: entryRecords.filter((e) => e.type == "pit"),
      };
    }
  }
</script>

<CompPageHeader compRecord={data.compRecord} surveyRecords={data.surveyRecords} page="teams" pageTitle="Teams" />

<div class="flex flex-col gap-4" style="view-transition-name:teams">
  {#if data.teams.length}
    <div class="flex flex-wrap gap-4">
      <select bind:value={selectedString} class="text-theme min-w-0 grow bg-neutral-800 p-2">
        {#each data.teams as team}
          <option value={team.number}>{team.number} {team.name}</option>
        {/each}
      </select>
    </div>

    {#each data.surveyRecords.toSorted((a, b) => b.modified.getTime() - a.modified.getTime()) as survey (survey.id)}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">{survey.name}</h2>

        {#if selected}
          <div class="@container overflow-x-auto">
            <TeamEntryTable pageData={getSurveyPageData(survey)} team={selected} />
          </div>
        {/if}
      </div>
    {/each}
  {:else}
    <span class="text-sm">No data on any teams.</span>
  {/if}
</div>
