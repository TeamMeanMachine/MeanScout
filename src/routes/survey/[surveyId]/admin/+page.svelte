<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditSurveyNameDialog from "$lib/dialogs/EditSurveyNameDialog.svelte";
  import EditSurveyTbaEventKeyDialog from "$lib/dialogs/EditSurveyTbaEventKeyDialog.svelte";
  import { objectStore, transaction } from "$lib/idb";
  import { tbaGetEventMatches, tbaGetEventTeams, tbaGetMatchScoreBreakdowns } from "$lib/tba";
  import { CalendarDaysIcon, CloudDownloadIcon, PlusIcon, SquarePenIcon } from "@lucide/svelte";
  import type { PageData } from "./$types";
  import AdminHeader from "./AdminHeader.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  async function getDataFromTbaEvent() {
    await getMatchesFromTbaEvent();
    await getTeamsFromTbaEvent();
  }

  async function getMatchesFromTbaEvent() {
    if (!data.surveyRecord.tbaEventKey) return;

    const response = await tbaGetEventMatches(data.surveyRecord.tbaEventKey);
    if (response) {
      const matches = structuredClone($state.snapshot(data.surveyRecord.matches));
      for (const match of response) {
        const matchIndex = matches.findIndex((m) => m.number == match.number);
        if (matchIndex == -1) {
          matches.push(match);
        } else {
          matches[matchIndex] = match;
        }
      }

      data = {
        ...data,
        surveyRecord: { ...data.surveyRecord, matches, modified: new Date() },
      } as PageData;
      objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
    }
  }

  async function getTeamsFromTbaEvent() {
    if (!data.surveyRecord.tbaEventKey) return;

    const response = await tbaGetEventTeams(data.surveyRecord.tbaEventKey);
    if (response) {
      const teams = structuredClone($state.snapshot(data.surveyRecord.teams));
      for (const team of response) {
        const teamIndex = teams.findIndex((t) => t.number == team.number);
        if (teamIndex == -1) {
          teams.push(team);
        } else {
          teams[teamIndex] = team;
        }
      }

      data = {
        ...data,
        surveyRecord: { ...data.surveyRecord, teams, modified: new Date() },
      } as PageData;
      objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
    }
  }

  function useTbaMetrics() {
    if (data.surveyType != "match" || !data.surveyRecord.tbaEventKey) return;

    data = {
      ...data,
      surveyRecord: { ...data.surveyRecord, tbaMetrics: [], modified: new Date() },
    };
    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
  }

  let tbaMetricInput = $state("");

  function addTbaMetric() {
    if (data.surveyType != "match" || !data.surveyRecord.tbaEventKey) return;

    tbaMetricInput = tbaMetricInput.trim();
    if (!tbaMetricInput) return;

    data = {
      ...data,
      surveyRecord: {
        ...data.surveyRecord,
        tbaMetrics: [...(data.surveyRecord.tbaMetrics || []), tbaMetricInput],
        modified: new Date(),
      },
    };
    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));

    tbaMetricInput = "";
  }

  function removeTbaMetric(tbaMetric: string) {
    if (data.surveyType != "match" || !data.surveyRecord.tbaEventKey || !data.surveyRecord.tbaMetrics?.length) return;
    data = {
      ...data,
      surveyRecord: {
        ...data.surveyRecord,
        tbaMetrics: data.surveyRecord.tbaMetrics.filter((m) => m != tbaMetric),
      },
    };
    objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
  }

  async function getDataFromTbaMetrics() {
    if (data.surveyType != "match" || !data.surveyRecord.tbaEventKey || !data.surveyRecord.tbaMetrics?.length) {
      return;
    }

    const response = await tbaGetMatchScoreBreakdowns(data.surveyRecord.tbaEventKey);
    if (!response?.length) return;

    const metricsTx = transaction(["surveys", "entries"], "readwrite");

    const entryStore = metricsTx.objectStore("entries");

    for (const { match, teams } of response) {
      for (const { team, tbaMetrics } of teams) {
        const entry = data.entryRecords.find((e) => e.team == team && e.type == "match" && e.match == match);
        if (!entry) continue;

        entryStore.put({ ...$state.snapshot(entry), tbaMetrics });
      }
    }

    metricsTx.objectStore("surveys").put({ ...$state.snapshot(data.surveyRecord), modified: new Date() });
  }
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <AdminHeader surveyRecord={data.surveyRecord} page="general" />

  <div class="flex flex-col gap-2">
    <Button
      onclick={() =>
        openDialog(EditSurveyNameDialog, {
          surveyRecord: data.surveyRecord,
          onedit(name) {
            data = {
              ...data,
              surveyRecord: { ...data.surveyRecord, name, modified: new Date() },
            } as PageData;
            objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
          },
        })}
    >
      <SquarePenIcon class="text-theme" />
      <div class="flex flex-col">
        {data.surveyRecord.name}
        <small>Edit name</small>
      </div>
    </Button>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">The Blue Alliance</h2>
    <Button
      onclick={() =>
        openDialog(EditSurveyTbaEventKeyDialog, {
          surveyRecord: data.surveyRecord,
          onedit(tbaEventKey) {
            data = {
              ...data,
              surveyRecord: { ...data.surveyRecord, tbaEventKey, modified: new Date() },
            } as PageData;
            objectStore("surveys", "readwrite").put($state.snapshot(data.surveyRecord));
          },
        })}
    >
      <CalendarDaysIcon class="text-theme" />
      {#if data.surveyRecord.tbaEventKey}
        <div class="flex flex-col">
          {data.surveyRecord.tbaEventKey}
          <small>Edit event</small>
        </div>
      {:else}
        Add event
      {/if}
    </Button>

    {#if data.surveyRecord.tbaEventKey}
      <Button onclick={getDataFromTbaEvent}>
        <CloudDownloadIcon class="text-theme" />
        <div class="flex flex-col">
          Get data from TBA
          <small>Matches, teams</small>
        </div>
      </Button>
    {/if}
  </div>

  {#if data.surveyType == "match" && data.surveyRecord.tbaEventKey}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">TBA Metrics</h2>

      {#if data.surveyRecord.tbaMetrics}
        <div class="flex flex-wrap gap-2">
          <input bind:value={tbaMetricInput} class="text-theme bg-neutral-800 p-2" />
          <Button onclick={addTbaMetric}>
            <PlusIcon class="text-theme" />
          </Button>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each data.surveyRecord.tbaMetrics as tbaMetric}
            <Button onclick={() => removeTbaMetric(tbaMetric)}>{tbaMetric}</Button>
          {/each}
        </div>
      {:else}
        <Button onclick={useTbaMetrics}>Use TBA metrics</Button>
      {/if}

      <Button onclick={getDataFromTbaMetrics}>
        <CloudDownloadIcon class="text-theme" />
        <div class="flex flex-col">
          Get data for these TBA metrics
          <small>Per-team score breakdowns</small>
        </div>
      </Button>
    </div>
  {/if}
</div>
