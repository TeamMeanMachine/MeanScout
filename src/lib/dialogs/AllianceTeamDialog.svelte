<script lang="ts">
  import { CircleCheckBigIcon, CircleIcon, Trash2Icon } from "@lucide/svelte";
  import { type Team } from "#lib";
  import Button from "#lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "#lib/dialog.ts";
  import { untrack } from "svelte";

  let props: {
    teams: Team[];
    teamNameMap: Map<string, string>;
    allianceIndex: number;
    teamLabel: string;
    onsubmit(team: string): void;
  } & ({ type: "add" } | { type: "edit"; team: string; ondelete(): void }) = $props();

  // svelte-ignore state_referenced_locally
  let team = $state($state.snapshot(props.type == "add" ? "" : props.team));

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      props.onsubmit(team);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  {#if props.type == "edit"}
    <span>Edit {props.teamLabel} of Alliance {props.allianceIndex + 1}</span>
    <Button
      onclick={() => {
        props.ondelete();
        closeDialog();
      }}
    >
      <Trash2Icon class="size-5 text-theme" />
    </Button>
  {:else}
    <span>Add {props.teamLabel} to Alliance {props.allianceIndex + 1}</span>
  {/if}
</div>

{#if props.teams.length}
  <div class="-m-1 flex max-h-125 flex-col gap-2 overflow-auto p-1">
    {#each props.teams as existingTeam}
      {const selected = $derived(team == (existingTeam.remap || existingTeam.number))}

      <Button
        onclick={() => (team = existingTeam.remap || existingTeam.number)}
        class={[selected ? "font-bold" : "font-light"]}
        {@attach (btn) => {
          if (untrack(() => selected)) {
            setTimeout(() => btn.scrollIntoView({ block: "center", inline: "center" }));
          }
        }}
      >
        {#if selected}
          <CircleCheckBigIcon class="size-5 text-theme" />
        {:else}
          <CircleIcon class="size-5 text-neutral-500" />
        {/if}

        <div class="flex flex-col truncate">
          {existingTeam.remap || existingTeam.number}
          {const teamName = $derived(props.teamNameMap.get(existingTeam.remap || existingTeam.number))}
          {#if teamName}
            <div class="text-sm">{teamName}</div>
          {/if}
        </div>
      </Button>
    {/each}
  </div>
{/if}

<label class="flex flex-col">
  <div class="flex items-baseline justify-between gap-x-3">
    <span>Team</span>
    <span class="truncate text-xs font-light">{props.teamNameMap.get(team)}</span>
  </div>
  <input bind:value={team} class="bg-neutral-800 p-2 text-theme" />
</label>
