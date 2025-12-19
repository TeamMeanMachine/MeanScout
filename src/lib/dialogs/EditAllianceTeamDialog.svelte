<script lang="ts">
  import { getTeamName, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { CircleCheckBigIcon, CircleIcon, Trash2Icon } from "@lucide/svelte";

  let {
    teams,
    allianceIndex,
    team,
    teamLabel,
    onedit,
    ondelete,
  }: {
    teams: Team[];
    allianceIndex: number;
    team: string;
    teamLabel: string;
    onedit(team: string): void;
    ondelete(): void;
  } = $props();

  let editingTeam = $state(structuredClone($state.snapshot(team)));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onedit(editingTeam);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Edit {teamLabel} of Alliance {allianceIndex + 1}</span>
  <Button
    onclick={() => {
      ondelete();
      closeDialog();
    }}
  >
    <Trash2Icon class="text-theme size-5" />
  </Button>
</div>

{#if teams.length}
  <div class="-m-1 flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
    {#each teams as existingTeam}
      {@const font = editingTeam == existingTeam.number ? "font-bold" : "font-light"}
      <Button onclick={() => (editingTeam = existingTeam.number)} class={font}>
        {#if editingTeam == existingTeam.number}
          <CircleCheckBigIcon class="text-theme size-5" />
        {:else}
          <CircleIcon class="text-theme size-5" />
        {/if}
        <div class="flex flex-col truncate">
          <span>{existingTeam.number}</span>
          <span class="truncate text-xs">{existingTeam.name}</span>
        </div>
      </Button>
    {/each}
  </div>
{/if}

<label class="flex flex-col">
  <div class="flex items-baseline justify-between gap-x-3">
    <span>Team</span>
    <span class="truncate text-xs font-light">{getTeamName(editingTeam, teams)}</span>
  </div>
  <input bind:value={editingTeam} class="text-theme bg-neutral-800 p-2" />
</label>
