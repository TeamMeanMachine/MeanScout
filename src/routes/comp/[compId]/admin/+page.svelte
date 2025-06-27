<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { tbaGetEventMatches, tbaGetEventTeams } from "$lib/tba";
  import { CalendarDaysIcon, CloudDownloadIcon, LoaderIcon, SquarePenIcon } from "@lucide/svelte";
  import type { PageData } from "./$types";
  import CompAdminHeader from "./CompAdminHeader.svelte";
  import EditCompNameDialog from "$lib/dialogs/EditCompNameDialog.svelte";
  import EditCompTbaEventKeyDialog from "$lib/dialogs/EditCompTbaEventKeyDialog.svelte";

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
    if (!data.compRecord.tbaEventKey) return;

    const response = await tbaGetEventMatches(data.compRecord.tbaEventKey);

    if (response) {
      const matchesTx = idb.transaction("comps", "readwrite");
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

      data = {
        ...data,
        compRecord: { ...data.compRecord, matches, modified: new Date() },
      } as PageData;
      matchesTx.objectStore("comps").put($state.snapshot(data.compRecord));
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
      } as PageData;
      idb.objectStore("comps", "readwrite").put($state.snapshot(data.compRecord));
    }
  }
</script>

<div class="flex flex-col gap-6" style="view-transition-name:admin">
  <CompAdminHeader compRecord={data.compRecord} page="general" />

  <div class="flex flex-col gap-2">
    <Button
      onclick={() =>
        openDialog(EditCompNameDialog, {
          compRecord: data.compRecord,
          onedit(name) {
            data = {
              ...data,
              compRecord: { ...data.compRecord, name, modified: new Date() },
            } as PageData;
            idb.objectStore("comps", "readwrite").put($state.snapshot(data.compRecord));
          },
        })}
    >
      <SquarePenIcon class="text-theme" />
      <div class="flex flex-col">
        {data.compRecord.name}
        <span class="text-xs font-light">Edit name</span>
      </div>
    </Button>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">The Blue Alliance</h2>
    <Button
      onclick={() =>
        openDialog(EditCompTbaEventKeyDialog, {
          compRecord: data.compRecord,
          onedit(tbaEventKey) {
            data = {
              ...data,
              compRecord: { ...data.compRecord, tbaEventKey, modified: new Date() },
            } as PageData;
            idb.objectStore("comps", "readwrite").put($state.snapshot(data.compRecord));
          },
        })}
    >
      <CalendarDaysIcon class="text-theme" />
      {#if data.compRecord.tbaEventKey}
        <div class="flex flex-col">
          {data.compRecord.tbaEventKey}
          <span class="text-xs font-light">Edit event</span>
        </div>
      {:else}
        Add event
      {/if}
    </Button>

    {#if data.compRecord.tbaEventKey}
      <Button onclick={getDataFromTbaEvent}>
        {#if isLoadingTbaData}
          <LoaderIcon class="text-theme animate-spin" />
        {:else}
          <CloudDownloadIcon class="text-theme" />
        {/if}
        <div class="flex flex-col">
          Get data from TBA
          <span class="text-xs font-light">Matches, teams</span>
        </div>
      </Button>
      {#if getTbaDataError}
        <span>{getTbaDataError}</span>
      {/if}
    {/if}
  </div>
</div>
