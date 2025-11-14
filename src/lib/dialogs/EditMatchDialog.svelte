<script lang="ts">
  import { compareMatches, matchLevels, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import { Trash2Icon } from "@lucide/svelte";
  import DeleteMatchDialog from "./DeleteMatchDialog.svelte";
  import SelectTeamDialog from "./SelectTeamDialog.svelte";
  import type { Comp } from "$lib/comp";

  let {
    match,
    comp,
    onupdate,
    ondelete,
  }: {
    match?: Match | undefined;
    comp: Comp;
    onupdate: (match: Match) => void;
    ondelete?: () => void;
  } = $props();

  const lastMatch = comp.matches.toSorted(compareMatches).at(-1);

  const newMatch: Match = {
    number: 1 + (lastMatch?.number || 0),
    set: lastMatch?.set || undefined,
    level: lastMatch?.level,
    red1: "",
    red2: "",
    red3: "",
    blue1: "",
    blue2: "",
    blue3: "",
  };

  let changes = $state(structuredClone($state.snapshot(match || newMatch)));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      const number = parseFloat(`${changes.number}`);
      if (Number.isNaN(number) || !Number.isInteger(number) || number < 1 || number > 999) {
        error = "invalid match number";
        return;
      }

      if (changes.set == 1) {
        changes.set = undefined;
      } else if (changes.set != undefined) {
        const set = parseFloat(`${changes.set}`);
        if (Number.isNaN(set) || !Number.isInteger(set) || set < 1 || set > 999) {
          error = "invalid set number";
          return;
        }
      }

      if (changes.level == "qm") {
        changes.level = undefined;
      } else if (changes.level && !matchLevels.includes(changes.level)) {
        error = "invalid match level";
        return;
      }

      changes.red1 = changes.red1.trim();
      changes.red2 = changes.red2.trim();
      changes.red3 = changes.red3.trim();
      changes.blue1 = changes.blue1.trim();
      changes.blue2 = changes.blue2.trim();
      changes.blue3 = changes.blue3.trim();

      if (!changes.red1) {
        error = "invalid value for red 1";
        return;
      }

      if (!changes.red2) {
        error = "invalid value for red 2";
        return;
      }

      if (!changes.red3) {
        error = "invalid value for red 3";
        return;
      }

      if (!changes.blue1) {
        error = "invalid value for blue 1";
        return;
      }

      if (!changes.blue2) {
        error = "invalid value for blue 2";
        return;
      }

      if (!changes.blue3) {
        error = "invalid value for blue 3";
        return;
      }

      onupdate(changes);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  {#if match}
    <span>
      Edit match
      {#if match.level && match.level != "qm"}
        {match.level}{match.set || 1}-{match.number}
      {:else}
        {match.number}
      {/if}
    </span>
  {:else}
    <span>New Match</span>
  {/if}

  {#if match && ondelete}
    <Button onclick={() => openDialog(DeleteMatchDialog, { match, ondelete })}>
      <Trash2Icon class="text-theme size-5" />
    </Button>
  {/if}
</div>

<div class="flex gap-2">
  <label class="flex w-full flex-col">
    Number
    <input
      type="number"
      pattern="[0-9]*"
      min="1"
      bind:value={changes.number}
      class="text-theme w-full bg-neutral-800 p-2"
    />
  </label>
  <label class="flex w-full flex-col">
    Set
    <input
      type="number"
      pattern="[0-9]*"
      min="1"
      bind:value={changes.set}
      placeholder="1"
      class="text-theme w-full bg-neutral-800 p-2"
    />
  </label>
  <label class="flex w-full flex-col">
    Level
    <select bind:value={changes.level} class="text-theme w-full bg-neutral-800 p-2">
      {#each matchLevels as level}
        <option value={level}>{level}</option>
      {/each}
    </select>
  </label>
</div>

{#snippet teamButton(teamKey: `${"red" | "blue"}${1 | 2 | 3}`, color: string, label: string)}
  <Button
    onclick={() => {
      openDialog(SelectTeamDialog, {
        comp,
        previousSelection: changes[teamKey],
        sortBy: changes.level && changes.level != "qm" ? "alliance" : "number",
        onselect(team) {
          changes[teamKey] = team;
        },
      });
    }}
    class="mb-2 w-full flex-col! items-start! gap-0!"
  >
    <span class="text-xs font-light">{label}</span>
    <span class="{color} {changes[teamKey] ? 'font-bold' : 'font-light'}">{changes[teamKey] || "Select"}</span>
  </Button>
{/snippet}

<div class="flex gap-2">
  <div class="flex w-full flex-col">
    <span>Red Teams</span>

    {@render teamButton("red1", "text-red", "Red 1")}
    {@render teamButton("red2", "text-red", "Red 2")}
    {@render teamButton("red3", "text-red", "Red 3")}

    <label class="flex flex-col">
      Red Score
      <input type="number" min="0" bind:value={changes.redScore} class="text-red w-full bg-neutral-800 p-2" />
    </label>
  </div>

  <div class="flex w-full flex-col">
    <span>Blue Teams</span>

    {@render teamButton("blue1", "text-blue", "Blue 1")}
    {@render teamButton("blue2", "text-blue", "Blue 2")}
    {@render teamButton("blue3", "text-blue", "Blue 3")}

    <label class="flex flex-col">
      Blue Score
      <input type="number" min="0" bind:value={changes.blueScore} class="text-blue w-full bg-neutral-800 p-2" />
    </label>
  </div>
</div>

{#if error}
  <span>Error: {error}</span>
{/if}
