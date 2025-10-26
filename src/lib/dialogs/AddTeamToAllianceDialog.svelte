<script lang="ts">
  import { allianceTeamLabels, type Team } from "$lib";
  import type { Alliance } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { PlusIcon, UserMinusIcon } from "@lucide/svelte";

  let {
    team,
    compAlliances,
    onadd,
  }: {
    team: Team;
    compAlliances: Alliance[];
    onadd(newAlliances: Alliance[]): void;
  } = $props();

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
        a.teams = a.teams.filter((t) => t != team.number);
        return a;
      })
      .filter((a) => a.teams.length);
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  {#if compAlliances.some((a) => a.teams.includes(team.number))}
    <span>Edit {team.number}'s alliance</span>
  {:else}
    <span>Add {team.number} to Alliance</span>
  {/if}

  <Button onclick={clearExistingOfThisTeam} disabled={alliances.every((a) => !a.teams.includes(team.number))}>
    <UserMinusIcon class="text-theme size-5" />
  </Button>
</div>

<div
  class="-mx-3 -my-1 grid max-h-[500px] gap-x-1 gap-y-3 overflow-auto px-3 py-1 text-center"
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
          if (alliance.teams.includes(team.number)) return;
          clearExistingOfThisTeam();
          const currentIndex = compAlliances[allianceIndex].teams.indexOf(team.number);
          if (currentIndex == -1) {
            alliance.teams.push(team.number);
          } else {
            alliance.teams.splice(currentIndex, 0, team.number);
          }
        }}
        disabled={alliance.teams.includes(team.number)}
        class="min-w-10 justify-center"
      >
        {allianceIndex + 1}
      </Button>

      {#each alliance.teams as t}
        <div
          class={[
            "min-w-15 justify-center",
            alliance.teams.includes(team.number) ? "font-bold" : "font-light",
            t == team.number ? "underline" : "",
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

  {#if !alliances.some((a) => a.teams.includes(team.number) && a.teams.length == 1)}
    <Button
      onclick={() => {
        clearExistingOfThisTeam();
        alliances.push({ teams: [team.number] });
      }}
      class="col-span-1 justify-self-center"
    >
      <PlusIcon class="text-theme" />
    </Button>
  {/if}
</div>
