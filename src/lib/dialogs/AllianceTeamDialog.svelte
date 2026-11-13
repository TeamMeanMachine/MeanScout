<script lang="ts">
  import { CircleCheckBigIcon, CircleIcon, Trash2Icon } from "@lucide/svelte";
  import { untrack } from "svelte";
  import { type Team } from "#lib";
  import Button from "#lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "#lib/dialog.ts";

  let props: {
    teams: Team[];
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
      {const selected = $derived(team == existingTeam.number)}

      <Button
        onclick={() => (team = existingTeam.number)}
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
          {existingTeam.number}
          {#if existingTeam.name}
            <div class="text-sm">{existingTeam.name}</div>
          {/if}
        </div>
      </Button>
    {/each}
  </div>
{/if}

<label class="flex flex-col">
  <div class="flex items-baseline justify-between gap-x-3">
    <span>Team</span>
    <span class="truncate text-xs font-light">{props.teams.find((t) => t.number == team)?.name}</span>
  </div>
  <input bind:value={team} class="bg-neutral-800 p-2 text-theme" />
</label>
