<script lang="ts">
  import { compareMatches, matchLevels, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import { Trash2Icon } from "@lucide/svelte";
  import DeleteMatchDialog from "./DeleteMatchDialog.svelte";
  import type { Comp } from "$lib/comp";
  import SelectTeamsDialog from "./SelectTeamsDialog.svelte";

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

<div class="flex gap-2">
  <div class="flex w-full flex-col">
    <span>Red Teams</span>

    <Button
      onclick={() => {
        openDialog(SelectTeamsDialog, {
          comp,
          previousSelection: [changes.red1, changes.red2, changes.red3],
          sortBy: changes.level && changes.level != "qm" ? "alliance" : "number",
          onselect(teams) {
            [changes.red1, changes.red2, changes.red3] = $state.snapshot(teams);
          },
        });
      }}
      class="mb-3 w-full flex-col! items-start!"
    >
      <div class="flex flex-col">
        <span class="text-xs font-light">Red 1</span>
        <span class="text-red">{changes.red1 || "--"}</span>
      </div>

      <div class="flex flex-col">
        <span class="text-xs font-light">Red 2</span>
        <span class="text-red">{changes.red2 || "--"}</span>
      </div>

      <div class="flex flex-col">
        <span class="text-xs font-light">Red 3</span>
        <span class="text-red">{changes.red3 || "--"}</span>
      </div>
    </Button>

    <label class="flex flex-col">
      Red Score
      <input type="number" min="0" bind:value={changes.redScore} class="text-red w-full bg-neutral-800 p-2" />
    </label>
  </div>

  <div class="flex w-full flex-col">
    <span>Blue Teams</span>

    <Button
      onclick={() => {
        openDialog(SelectTeamsDialog, {
          comp,
          previousSelection: [changes.blue1, changes.blue2, changes.blue3],
          sortBy: changes.level && changes.level != "qm" ? "alliance" : "number",
          onselect(teams) {
            [changes.blue1, changes.blue2, changes.blue3] = $state.snapshot(teams);
          },
        });
      }}
      class="mb-3 w-full flex-col! items-start!"
    >
      <div class="flex flex-col">
        <span class="text-xs font-light">Blue 1</span>
        <span class="text-blue">{changes.blue1 || "--"}</span>
      </div>

      <div class="flex flex-col">
        <span class="text-xs font-light">Blue 2</span>
        <span class="text-blue">{changes.blue2 || "--"}</span>
      </div>

      <div class="flex flex-col">
        <span class="text-xs font-light">Blue 3</span>
        <span class="text-blue">{changes.blue3 || "--"}</span>
      </div>
    </Button>

    <label class="flex flex-col">
      Blue Score
      <input type="number" min="0" bind:value={changes.blueScore} class="text-blue w-full bg-neutral-800 p-2" />
    </label>
  </div>
</div>

{#if error}
  <span>Error: {error}</span>
{/if}
