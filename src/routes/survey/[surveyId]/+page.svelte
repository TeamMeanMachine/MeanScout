<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditSurveyNameDialog from "$lib/dialogs/EditSurveyNameDialog.svelte";
  import { idb } from "$lib/idb";
  import { PlusIcon, SquareArrowOutUpRightIcon, SquarePenIcon } from "@lucide/svelte";
  import type { PageData, PageProps } from "./$types";
  import { rerunAllContextLoads } from "$lib";

  let { data }: PageProps = $props();

  function useTbaMetrics() {
    if (data.survey.type != "match" || !data.compRecord.tbaEventKey) return;

    data = {
      ...data,
      survey: { ...data.survey, record: { ...data.survey.record, tbaMetrics: [], modified: new Date() } },
    };
    idb.put("surveys", $state.snapshot(data.survey.record)).onsuccess = rerunAllContextLoads;
  }

  let tbaMetricInput = $state("");

  function addTbaMetric() {
    if (data.survey.type != "match" || !data.compRecord.tbaEventKey) return;

    tbaMetricInput = tbaMetricInput.trim().replaceAll(/robot[123]/gi, "");
    if (!tbaMetricInput) return;

    data = {
      ...data,
      survey: {
        ...data.survey,
        record: {
          ...data.survey.record,
          tbaMetrics: [...(data.survey.record.tbaMetrics || []), tbaMetricInput],
          modified: new Date(),
        },
      },
    };
    idb.put("surveys", $state.snapshot(data.survey.record)).onsuccess = rerunAllContextLoads;

    tbaMetricInput = "";
  }

  function removeTbaMetric(tbaMetric: string) {
    if (data.survey.type != "match" || !data.compRecord.tbaEventKey || !data.survey.record.tbaMetrics?.length) return;
    data = {
      ...data,
      survey: {
        ...data.survey,
        record: {
          ...data.survey.record,
          tbaMetrics: data.survey.record.tbaMetrics.filter((m) => m != tbaMetric),
        },
      },
    };
    idb.put("surveys", $state.snapshot(data.survey.record)).onsuccess = rerunAllContextLoads;
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-2">
    <Button
      onclick={() =>
        openDialog(EditSurveyNameDialog, {
          surveyRecord: data.survey.record,
          onedit(name) {
            data = {
              ...data,
              survey: {
                ...data.survey,
                record: { ...data.survey.record, name, modified: new Date() },
              },
            } as PageData;
            idb.put("surveys", $state.snapshot(data.survey.record)).onsuccess = rerunAllContextLoads;
          },
        })}
    >
      <SquarePenIcon class="text-theme" />
      <div class="flex flex-col">
        {data.survey.record.name}
        <span class="text-xs font-light">Edit name</span>
      </div>
    </Button>
  </div>

  {#if data.compRecord.tbaEventKey && data.survey.type == "match"}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">TBA Metrics</h2>

      {#if data.survey.record.tbaMetrics}
        <div class="flex flex-wrap gap-2">
          <input bind:value={tbaMetricInput} class="text-theme bg-neutral-800 p-2" />
          <Button onclick={addTbaMetric}>
            <PlusIcon class="text-theme" />
          </Button>
        </div>
        <div class="flex flex-wrap gap-2 text-sm">
          {#each data.survey.record.tbaMetrics as tbaMetric}
            <Button onclick={() => removeTbaMetric(tbaMetric)}>{tbaMetric}</Button>
          {/each}
        </div>
        <span class="mt-2 text-sm font-light">
          You can use per-robot metrics from TBA match breakdowns. Metrics you choose must include "robot[1,2,3]".
        </span>
        <span class="text-sm font-light">
          <a href="https://www.thebluealliance.com/apidocs/v3" target="_blank">
            <span class="underline">Visit the TBA API docs</span>
            <SquareArrowOutUpRightIcon class="text-theme inline size-4" strokeWidth={3} />
          </a>
          to view available metrics; you'll find them in the "Match_Score_Breakdown_[year]_Alliance" schemas.
        </span>
        <span class="text-sm font-light">
          Once you've added some metrics, you can create expressions in the Ranks page to convert them to usable point
          values.
        </span>
      {:else}
        <Button onclick={useTbaMetrics}>Use TBA metrics</Button>
      {/if}
    </div>
  {/if}
</div>
