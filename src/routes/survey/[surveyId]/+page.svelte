<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import EditSurveyNameDialog from "$lib/dialogs/EditSurveyNameDialog.svelte";
  import { idb } from "$lib/idb";
  import { tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";
  import { CloudDownloadIcon, LoaderIcon, PlusIcon, SquarePenIcon } from "@lucide/svelte";
  import type { PageData, PageProps } from "./$types";
  import { invalidateAll } from "$app/navigation";

  let { data }: PageProps = $props();

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
    invalidateAll();
  }

  async function getMatchesFromTbaEvent() {
    if (!data.compRecord.tbaEventKey) return;

    const response = await tbaGetEventMatches(data.compRecord.tbaEventKey);

    if (response) {
      const matchesTx = idb.transaction(["comps", "surveys", "entries"], "readwrite");
      matchesTx.onabort = () => {
        getTbaDataError = "Error while trying to get matches";
      };

      const matches = structuredClone($state.snapshot(data.compRecord.matches));

      for (const { match } of response) {
        const matchIndex = matches.findIndex((m) => m.number == match.number);

        if (matchIndex == -1) {
          matches.push(match);
        } else {
          matches[matchIndex] = match;
        }
      }

      if (data.survey.type == "match" && data.survey.record.tbaMetrics?.length) {
        const entryStore = matchesTx.objectStore("entries");

        for (const { match, breakdowns } of response) {
          if (!breakdowns) continue;

          for (const { team, tbaMetrics } of breakdowns) {
            const entry = data.survey.entryRecords.find(
              (e) => e.team == team && e.type == "match" && e.match == match.number,
            );
            if (!entry) continue;

            entryStore.put({ ...$state.snapshot(entry), tbaMetrics });
          }
        }
      }

      data = {
        ...data,
        compRecord: { ...data.compRecord, matches, modified: new Date() },
        survey: { ...data.survey, record: { ...data.survey.record, modified: new Date() } },
      } as PageData;
      matchesTx.objectStore("comps").put($state.snapshot(data.compRecord));
      matchesTx.objectStore("surveys").put($state.snapshot(data.survey.record));
    }
  }

  async function getTeamsFromTbaEvent() {
    if (!data.compRecord.tbaEventKey) return;

    const response = await tbaGetEventTeams(data.compRecord.tbaEventKey);
    if (response) {
      const teams = structuredClone($state.snapshot(data.compRecord.teams));
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
        compRecord: { ...data.compRecord, teams, modified: new Date() },
        survey: { ...data.survey, record: { ...data.survey.record, modified: new Date() } },
      } as PageData;
      idb.put("comps", $state.snapshot(data.compRecord));
      idb.put("surveys", $state.snapshot(data.survey.record));
    }
  }

  function useTbaMetrics() {
    if (data.survey.type != "match" || !data.compRecord.tbaEventKey) return;

    data = {
      ...data,
      survey: { ...data.survey, record: { ...data.survey.record, tbaMetrics: [], modified: new Date() } },
    };
    idb.put("surveys", $state.snapshot(data.survey.record)).onsuccess = invalidateAll;
  }

  let tbaMetricInput = $state("");

  function addTbaMetric() {
    if (data.survey.type != "match" || !data.compRecord.tbaEventKey) return;

    tbaMetricInput = tbaMetricInput.trim();
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
    idb.put("surveys", $state.snapshot(data.survey.record)).onsuccess = invalidateAll;

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
    idb.put("surveys", $state.snapshot(data.survey.record)).onsuccess = invalidateAll;
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
            idb.put("surveys", $state.snapshot(data.survey.record)).onsuccess = invalidateAll;
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

  {#if data.compRecord.tbaEventKey}
    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <h2 class="font-bold">The Blue Alliance</h2>
        <span class="text-xs font-light">{data.compRecord.tbaEventKey}</span>
      </div>

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
            {data.survey.type == "match" && data.survey.record.tbaMetrics?.length ? "metrics," : ""}
            teams
          </span>
        </div>
      </Button>
      {#if getTbaDataError}
        <span>{getTbaDataError}</span>
      {/if}
    </div>

    {#if data.survey.type == "match"}
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">TBA Metrics</h2>

        {#if data.survey.record.tbaMetrics}
          <div class="flex flex-wrap gap-2">
            <input bind:value={tbaMetricInput} class="text-theme bg-neutral-800 p-2" />
            <Button onclick={addTbaMetric}>
              <PlusIcon class="text-theme" />
            </Button>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each data.survey.record.tbaMetrics as tbaMetric}
              <Button onclick={() => removeTbaMetric(tbaMetric)}>{tbaMetric}</Button>
            {/each}
          </div>
        {:else}
          <Button onclick={useTbaMetrics}>Use TBA metrics</Button>
        {/if}
      </div>
    {/if}
  {/if}
</div>
