<script lang="ts">
  import { openDialog } from "$lib/dialog";
  import ViewTeamDialog from "$lib/dialogs/ViewTeamDialog.svelte";
  import Button from "./Button.svelte";
  import type { AnalysisData } from "$lib/analysis";
  import { getOrdinal } from "$lib";
  import type { SurveyPageData } from "$lib/survey";

  let {
    pageData,
    analysisData,
  }: {
    pageData: SurveyPageData;
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
      <div class="flex items-baseline">
        <span class="font-bold">{rank + 1}</span>
        <span class="hidden text-xs font-light sm:inline">{getOrdinal(rank + 1)}</span>
      </div>
    </Button>

    <div>
      <div class="flex items-end justify-between gap-3">
        <div class="flex flex-col">
          <span class="font-bold">{teamData.team}</span>
          {#if teamData.teamName}
            <span class="text-xs font-light">{teamData.teamName}</span>
          {/if}
        </div>
        {#if "value" in teamData}
          {teamData.value.toFixed(2)}
        {:else}
          <span>{teamData.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
        {/if}
      </div>
      <div class="bg-neutral-800">
        <div style="background-color:{color};width:{teamData.percentage.toFixed(2)}%;height:6px"></div>
      </div>
    </div>
  {/each}
</div>
