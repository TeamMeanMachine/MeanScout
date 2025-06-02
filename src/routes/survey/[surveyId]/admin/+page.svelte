<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditSurveyNameDialog from "$lib/dialogs/EditSurveyNameDialog.svelte";
  import EditSurveyTbaEventKeyDialog from "$lib/dialogs/EditSurveyTbaEventKeyDialog.svelte";
  import { objectStore, transaction } from "$lib/idb";
  import { tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";
  import { CalendarDaysIcon, CloudDownloadIcon, LoaderIcon, PlusIcon, SquarePenIcon } from "@lucide/svelte";
  import type { PageData } from "./$types";
  import AdminHeader from "./AdminHeader.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  let getTbaDataError = $state("");
  let isLoadingTbaData = $state(false);

  async function getDataFromTbaEvent() {
    getTbaDataError = "";
    isLoadingTbaData = true;

    try {
      await getMatchesFromTbaEvent();
    } catch (e) {
      getTbaDataError = "Error while trying to get matches";
      console.error(e);
    }

    try {
      await getTeamsFromTbaEvent();
    } catch (e) {
      getTbaDataError = "Error while trying to get teams";
      console.error(e);
    }

    isLoadingTbaData = false;
  }

  async function getMatchesFromTbaEvent() {
    if (!data.surveyRecord.tbaEventKey) return;

    const response = await tbaGetEventMatches(data.surveyRecord.tbaEventKey);

    if (response) {
      const matchesTx = transaction(["surveys", "entries"], "readwrite");
      matchesTx.onabort = () => {
        getTbaDataError = "Error while trying to get matches";
      };

      const matches = structuredClone($state.snapshot(data.surveyRecord.matches));

      for (const { match } of response) {
        const matchIndex = matches.findIndex((m) => m.number == match.number);

        if (matchIndex == -1) {
          matches.push(match);
        } else {
          matches[matchIndex] = match;
        }
      }

      if (data.surveyType == "match" && data.surveyRecord.tbaMetrics?.length) {
        const entryStore = matchesTx.objectStore("entries");

        for (const { match, breakdowns } of response) {
          if (!breakdowns) continue;

          for (const { team, tbaMetrics } of breakdowns) {
            const entry = data.entryRecords.find((e) => e.team == team && e.type == "match" && e.match == match.number);
            if (!entry) continue;

            entryStore.put({ ...$state.snapshot(entry), tbaMetrics });
          }
        }
      }

      data = {
        ...data,
        surveyRecord: { ...data.surveyRecord, matches, modified: new Date() },
      } as PageData;
      matchesTx.objectStore("surveys").put($state.snapshot(data.surveyRecord));
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
        <span class="text-xs font-light">Edit name</span>
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
          <span class="text-xs font-light">Edit event</span>
        </div>
      {:else}
        Add event
      {/if}
    </Button>

    {#if data.surveyRecord.tbaEventKey}
      <Button onclick={getDataFromTbaEvent}>
        {#if isLoadingTbaData}
          <LoaderIcon class="text-theme animate-spin" />
        {:else}
          <CloudDownloadIcon class="text-theme" />
        {/if}
        <div class="flex flex-col">
          Get data from TBA
          <span class="text-xs font-light">
            Matches,
            {data.surveyType == "match" && data.surveyRecord.tbaMetrics?.length ? "metrics," : ""}
            teams
          </span>
        </div>
      </Button>
      {#if getTbaDataError}
        <span>{getTbaDataError}</span>
      {/if}
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
    </div>
  {/if}
</div>
