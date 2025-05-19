<script lang="ts">
  import { openDialog } from "$lib/dialog";
  import ViewTeamDialog from "$lib/dialogs/ViewTeamDialog.svelte";
  import Button from "./Button.svelte";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import type { AnalysisData } from "$lib/analysis";
  import { getOrdinal } from "$lib";

  let {
    pageData,
    analysisData,
  }: {
    pageData: PageData;
    analysisData: AnalysisData;
  } = $props();
</script>

<div class="grid gap-x-3 gap-y-4" style="grid-template-columns:min-content auto">
  {#each analysisData.data as teamData, rank}
    {@const color = `rgb(var(--theme-color) / ${teamData.percentage.toFixed(2)}%)`}

    <Button
      onclick={() => {
        openDialog(ViewTeamDialog, { pageData, team: { number: teamData.team, name: teamData.teamName } });
      }}
      class="justify-center text-sm"
    >
      <div>
        <span class="font-bold">{rank + 1}</span><span class="hidden text-xs sm:inline">{getOrdinal(rank + 1)}</span>
      </div>
    </Button>

    <div>
      <div class="flex items-end justify-between gap-3">
        <div class="flex flex-col">
          <strong>{teamData.team}</strong>
          {#if teamData.teamName}
            <small class="font-light">{teamData.teamName}</small>
          {/if}
        </div>
        {#if "value" in teamData}
          {teamData.value.toFixed(2)}
        {:else}
          <span>{teamData.percentage.toFixed(1)}<span class="text-sm">%</span></span>
        {/if}
      </div>
      <div class="bg-neutral-800">
        <div style="background-color:{color};width:{teamData.percentage.toFixed(2)}%;height:6px"></div>
      </div>
    </div>
  {/each}
</div>
