<script lang="ts">
  import { getTeamName, isValidTeam, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";
  import { slide } from "svelte/transition";

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
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) return;

      selectedTeam = selectedTeam.trim();

      if (!selectedTeam) {
        error = "No team inputted";
        return;
      }

      if (!isValidTeam(selectedTeam)) {
        error = "Invalid team";
        return;
      }

      onselect(selectedTeam);
      closeDialog();
    },
  };
</script>

<div class="flex flex-col">
  <label class="flex flex-col mb-3">
    <div class="flex justify-between items-end truncate gap-x-3">
      <span>Input team</span>
      <span class="text-xs font-light truncate max-w-1/2">{getTeamName(selectedTeam, teams)}</span>
    </div>
    <input
      bind:value={selectedTeam}
      oninput={() => {
        if (isValidTeam(selectedTeam)) error = "";
        else error = "Invalid team";
      }}
      class="text-theme bg-neutral-800 p-2"
    />
  </label>

  {#if teams.length}
    <div class="flex flex-col gap-3">
      {#if error}
        <span class="text-sm font-bold">Error: {error}</span>
      {:else}
        <span class="text-sm">Or, select a team below</span>
      {/if}

      <div class="@container -m-1 flex max-h-[400px] flex-col gap-2 overflow-auto p-1">
        {#each teams as team}
          {@const selected = team.number == selectedTeam}
          {@const font = selected ? "font-bold" : "font-light"}

          <Button
            onclick={() => {
              selectedTeam = team.number;
              error = "";
            }}
            class="flex-nowrap! {font}"
          >
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
    </div>
  {:else if error}
    <span class="text-sm font-bold" transition:slide>Error: {error}</span>
  {/if}
</div>
