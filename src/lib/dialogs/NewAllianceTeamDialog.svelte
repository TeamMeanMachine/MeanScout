<script lang="ts">
  import { getTeamName, type Team } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";

  let {
    teams,
    allianceIndex,
    teamLabel,
    onadd,
  }: {
    teams: Team[];
    allianceIndex: number;
    teamLabel: string;
    onadd(newTeam: string): void;
  } = $props();

  let team = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onadd(team);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>Add {teamLabel} to Alliance {allianceIndex + 1}</span>
</div>

{#if teams.length}
  <div class="-m-1 flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
    {#each teams as existingTeam}
      {@const font = team == existingTeam.number ? "font-bold" : "font-light"}
      <Button onclick={() => (team = existingTeam.number)} class={font}>
        {#if team == existingTeam.number}
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
    <span class="truncate text-xs font-light">{getTeamName(team, teams)}</span>
  </div>
  <input bind:value={team} class="text-theme bg-neutral-800 p-2" />
</label>
