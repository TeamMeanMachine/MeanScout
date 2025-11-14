<script lang="ts">
  import { allianceTeamLabels } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";

  let {
    comp,
    sortBy,
    previousSelection,
    onselect,
  }: {
    comp: Comp;
    sortBy: "number" | "alliance";
    previousSelection?: string | undefined;
    onselect(team: string): void;
  } = $props();

  const allianceTeams = comp.alliances?.flatMap((a) => a.teams);

  const sortedTeams = $derived.by(() => {
    if (sortBy == "alliance" && comp.alliances?.length) {
      return comp.teams.toSorted((a, b) => {
        const numberCompare = a.number.localeCompare(b.number, "en", { numeric: true });

        const aAllianceIndex = allianceTeams?.indexOf(a.number);
        const bAllianceIndex = allianceTeams?.indexOf(b.number);

        if (aAllianceIndex != undefined && bAllianceIndex == undefined) {
          return -1;
        }

        if (aAllianceIndex == undefined && bAllianceIndex != undefined) {
          return 1;
        }

        if (aAllianceIndex != undefined && bAllianceIndex != undefined) {
          if (aAllianceIndex > -1 && bAllianceIndex == -1) {
            return -1;
          }

          if (aAllianceIndex == -1 && bAllianceIndex > -1) {
            return 1;
          }

          if (aAllianceIndex > -1 && bAllianceIndex > -1) {
            return aAllianceIndex - bAllianceIndex;
          }
        }

        return numberCompare;
      });
    }

    return comp.teams.toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
  });

  const groupedTeams = $derived(
    Object.groupBy(sortedTeams, (team) => {
      if (!comp.alliances || sortBy == "number") return "Teams";
      const allianceIndex = comp.alliances.findIndex((a) => a.teams.includes(team.number));
      if (allianceIndex == -1) return "Teams";
      return ("Alliance " + (allianceIndex + 1)) as `Alliance ${number}`;
    }),
  );

  const multipleGroups = $derived(Object.values(groupedTeams).length > 1);

  let selection = $state(previousSelection || "");
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      selection = selection.trim();
      if (!selection) {
        error = "invalid value";
        return;
      }

      onselect(selection);
      closeDialog();
    },
  };
</script>

<span>Select team</span>

<div class="-m-1 flex max-h-[500px] flex-col gap-2 overflow-auto p-1">
  {#each Object.entries(groupedTeams).toSorted(([a], [b]) => a.localeCompare(b)) as [group, teams]}
    {#if multipleGroups}
      <span class="mr-2 text-end text-sm not-first:mt-2">{group}</span>
    {/if}
    {#each teams || [] as team}
      {@const allianceWithIndex = comp.alliances
        ?.map((a, i) => ({ ...a, i }))
        .find((a) => a.teams.includes(team.number))}
      {@const font = selection == team.number ? "font-bold" : "font-light"}

      <Button onclick={() => (selection = team.number)} class="flex-nowrap! {font} justify-between">
        <div class="flex items-center gap-2 truncate">
          {#if selection == team.number}
            <CircleCheckBigIcon class="text-theme size-5 shrink-0" />
          {:else}
            <CircleIcon class="text-theme size-5 shrink-0" />
          {/if}
          <div class="flex flex-col truncate">
            <span>{team.number}</span>
            <span class="truncate text-xs">{team.name}</span>
          </div>
        </div>

        {#if allianceWithIndex}
          <div class="flex flex-col text-end text-nowrap">
            <div class="text-xs tracking-tighter">
              {#if sortBy == "number"}
                Alliance {allianceWithIndex.i + 1}<br />
              {/if}
              {allianceTeamLabels[allianceWithIndex.teams.indexOf(team.number)] || "Backup"}
            </div>
          </div>
        {/if}
      </Button>
    {/each}
  {/each}
</div>

<label class="flex flex-col">
  <div class="flex items-baseline justify-between gap-x-3">
    <span>Team</span>
    <span class="truncate text-xs font-light">
      {comp.teams.find((t) => t.number == selection)?.name}
    </span>
  </div>
  <input bind:value={selection} class="text-theme bg-neutral-800 p-2" />
</label>

{#if error}
  <span>Error: {error}</span>
{/if}
