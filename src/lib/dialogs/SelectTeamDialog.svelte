<script lang="ts">
  import { getTeamName, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";

  let {
    teams,
    prefilled,
    onselect,
  }: {
    teams: Team[];
    prefilled: string;
    onselect(team: string): void;
  } = $props();

  let selectedTeam = $state($state.snapshot(prefilled));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (selectedTeam.length) {
        onselect(selectedTeam);
        closeDialog();
      }
    },
  };
</script>

<span>Select team</span>

<div class="@container -m-1 flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
  {#each teams as team}
    {@const selected = team.number == selectedTeam}
    {@const font = selected ? "font-bold" : "font-light"}

    <Button onclick={() => (selectedTeam = team.number)} class="flex-nowrap! {font}">
      {#if selected}
        <CircleCheckBigIcon class="text-theme size-5 shrink-0" />
      {:else}
        <CircleIcon class="text-theme size-5 shrink-0" />
      {/if}
      <div class="flex flex-col truncate">
        <span>{team.number}</span>
        <span class="truncate text-xs">{team.name || getTeamName(team.number, teams)}</span>
      </div>
    </Button>
  {:else}
    <span class="text-sm">No teams.</span>
  {/each}
</div>

<label class="flex flex-col">
  <div class="flex justify-between items-end truncate gap-x-3">
    <span>Team</span>
    <span class="text-xs font-light truncate max-w-1/2">{getTeamName(selectedTeam, teams)}</span>
  </div>
  <input bind:value={selectedTeam} class="text-theme bg-neutral-800 p-2" />
</label>
