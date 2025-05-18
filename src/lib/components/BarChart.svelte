<script lang="ts">
  import { openDialog } from "$lib/dialog";
  import ViewTeamDialog from "$lib/dialogs/ViewTeamDialog.svelte";
  import Button from "./Button.svelte";
  import type { PageData } from "../../routes/survey/[surveyId]/$types";
  import type { AnalysisData } from "$lib/analysis";

  let {
    pageData,
    analysisData,
  }: {
    pageData: PageData;
    analysisData: AnalysisData;
  } = $props();
</script>

<div class="grid gap-y-2" style="grid-template-columns:min-content auto">
  {#if analysisData.type == "picklist"}
    {#each analysisData.data as { team, teamName, percentage }, i}
      {@const color = `rgb(var(--theme-color) / ${percentage.toFixed(2)}%)`}

      <Button
        onclick={() => {
          openDialog(ViewTeamDialog, { pageData, team: { number: team, name: teamName } });
        }}
        class="col-span-2 grid grid-cols-subgrid gap-x-3"
      >
        <div class="flex flex-col justify-center text-center text-sm font-bold">{i + 1}</div>
        <div>
          <div class="flex items-end justify-between gap-3">
            <div class="flex flex-col">
              <strong>{team}</strong>
              {#if teamName}
                <small class="font-light">{teamName}</small>
              {/if}
            </div>
            {percentage.toFixed(1)}%
          </div>
          <div class="bg-neutral-700">
            <div style="background-color:{color};width:{percentage.toFixed(2)}%;height:6px"></div>
          </div>
        </div>
      </Button>
    {/each}
  {:else}
    {#each analysisData.data as { team, teamName, value }, i}
      {@const percentage = Math.abs(
        ((value - Math.min(analysisData.minValue, 0)) /
          (analysisData.maxValue || analysisData.minValue || value || 1)) *
          100,
      )}
      {@const color = `rgb(var(--theme-color) / ${percentage.toFixed(2)}%)`}

      <Button
        onclick={() => {
          openDialog(ViewTeamDialog, { pageData, team: { number: team, name: teamName } });
        }}
        class="col-span-2 grid grid-cols-subgrid gap-x-3"
      >
        <div class="flex flex-col justify-center text-center text-sm font-bold">{i + 1}</div>
        <div>
          <div class="flex items-end justify-between gap-3">
            <div class="flex flex-col">
              <strong>{team}</strong>
              {#if teamName}
                <small class="font-light">{teamName}</small>
              {/if}
            </div>
            {value.toFixed(2)}
          </div>
          <div class="bg-neutral-700">
            <div style="background-color:{color};width:{percentage.toFixed(2)}%;height:6px"></div>
          </div>
        </div>
      </Button>
    {/each}
  {/if}
</div>
