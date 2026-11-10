<script lang="ts">
  import { PlusIcon, UserMinusIcon } from "@lucide/svelte";
  import { allianceTeamLabels, type Team } from "#lib";
  import type { Alliance } from "#lib/comp.ts";
  import Button from "#lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "#lib/dialog.ts";

  let {
    team,
    compAlliances,
    onadd,
  }: {
    team: Team;
    compAlliances: Alliance[];
    onadd(newAlliances: Alliance[]): void;
  } = $props();

  const bestNumber = $derived(team.remap || team.number);

  // svelte-ignore state_referenced_locally
  let alliances = $state($state.snapshot(compAlliances));

  const standardCols = 4;

  const mostBackups = $derived(
    alliances.map((a) => a.teams.length).reduce((prev, curr) => Math.max(prev, curr - 3), 0) || 0,
  );

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onadd(alliances);
      closeDialog();
    },
  };

  function clearExistingOfThisTeam() {
    alliances = alliances
      .map((a) => {
        a.teams = a.teams.filter((t) => t != bestNumber);
        return a;
      })
      .filter((a) => a.teams.length);
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  {#if compAlliances.some((a) => a.teams.includes(bestNumber))}
    <span>Edit {bestNumber}'s alliance</span>
  {:else}
    <span>Add {bestNumber} to Alliance</span>
  {/if}

  <Button onclick={clearExistingOfThisTeam} disabled={alliances.every((a) => !a.teams.includes(bestNumber))}>
    <UserMinusIcon class="size-5 text-theme" />
  </Button>
</div>

<div
  class="-mx-3 -my-1 grid max-h-125 gap-x-1 gap-y-3 overflow-auto px-3 py-1 text-center"
  style="grid-template-columns: repeat({mostBackups + standardCols}, min-content);"
>
  <div class="col-span-full grid grid-cols-subgrid text-xs font-light tracking-tighter text-nowrap">
    <div></div>
    {#each allianceTeamLabels as label}
      <div>{label}</div>
    {/each}
    {#if mostBackups}
      <div>Backup</div>
    {/if}
  </div>

  {#each alliances as alliance, allianceIndex}
    <div class="col-span-full grid grid-cols-subgrid items-center">
      <Button
        onclick={() => {
          if (alliance.teams.includes(bestNumber)) return;
          clearExistingOfThisTeam();
          const currentIndex = compAlliances[allianceIndex].teams.indexOf(bestNumber);
          if (currentIndex == -1) {
            alliance.teams.push(bestNumber);
          } else {
            alliance.teams.splice(currentIndex, 0, bestNumber);
          }
        }}
        disabled={alliance.teams.includes(bestNumber)}
        class="min-w-10 justify-center"
      >
        {allianceIndex + 1}
      </Button>

      {#each alliance.teams as t}
        <div
          class={[
            "min-w-15 justify-center",
            alliance.teams.includes(bestNumber) ? "font-bold" : "font-light",
            t == bestNumber ? "underline" : "",
          ]}
        >
          {t}
        </div>
      {/each}

      {#each { length: mostBackups - (alliance.teams.length - 3) }}
        <div></div>
      {/each}
    </div>
  {/each}

  {#if !alliances.some((a) => a.teams.includes(bestNumber) && a.teams.length == 1)}
    <Button
      onclick={() => {
        clearExistingOfThisTeam();
        alliances.push({ teams: [bestNumber] });
      }}
      class="col-span-1 justify-self-center"
    >
      <PlusIcon class="text-theme" />
    </Button>
  {/if}
</div>
