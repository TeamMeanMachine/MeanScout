<script lang="ts">
  import { Trash2Icon } from "@lucide/svelte";
  import { compareMatches, isValidTeam, matchLevels, type Match } from "$lib";
  import type { Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import { slide } from "svelte/transition";
  import DeleteMatchDialog from "./DeleteMatchDialog.svelte";
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
  let errors = $state<string[]>([]);

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      errors = [];

      const number = parseFloat(`${changes.number}`);
      if (Number.isNaN(number) || !Number.isInteger(number) || number < 1 || number > 999) {
        errors.push("invalid match number");
      }

      if (changes.set == 1) {
        changes.set = undefined;
      } else if (changes.set != undefined) {
        const set = parseFloat(`${changes.set}`);
        if (Number.isNaN(set) || !Number.isInteger(set) || set < 1 || set > 999) {
          errors.push("invalid set number");
        }
      }

      if (changes.level == "qm") {
        changes.level = undefined;
      } else if (changes.level && !matchLevels.includes(changes.level)) {
        errors.push("invalid match level");
      }

      changes.red1 = changes.red1.trim();
      changes.red2 = changes.red2.trim();
      changes.red3 = changes.red3.trim();
      changes.blue1 = changes.blue1.trim();
      changes.blue2 = changes.blue2.trim();
      changes.blue3 = changes.blue3.trim();

      [changes.red1, changes.red2, changes.red3, changes.blue1, changes.blue2, changes.blue3].forEach((team) => {
        if (team && !isValidTeam(team)) {
          errors.push(`invalid team: '${team}'`);
        }
      });

      if (!changes.red1 && !changes.red2 && !changes.red3) {
        errors.push("at least 1 red team required");
      }

      if (!changes.blue1 && !changes.blue2 && !changes.blue3) {
        errors.push("at least 1 blue team required");
      }

      if (errors.length) {
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
      <Trash2Icon class="size-5 text-theme" />
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
      class="w-full bg-neutral-800 p-2 text-theme"
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
      class="w-full bg-neutral-800 p-2 text-theme"
    />
  </label>
  <label class="flex w-full flex-col">
    Level
    <select bind:value={changes.level} class="w-full bg-neutral-800 p-2 text-theme">
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
          onselect([red1, red2, red3]) {
            changes.red1 = red1 || "";
            changes.red2 = red2 || "";
            changes.red3 = red3 || "";
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
      <input type="number" min="0" bind:value={changes.redScore} class="w-full bg-neutral-800 p-2 text-red" />
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
          onselect([blue1, blue2, blue3]) {
            changes.blue1 = blue1 || "";
            changes.blue2 = blue2 || "";
            changes.blue3 = blue3 || "";
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
      <input type="number" min="0" bind:value={changes.blueScore} class="w-full bg-neutral-800 p-2 text-blue" />
    </label>
  </div>
</div>

{#if errors.length}
  <div class="flex flex-col" transition:slide>
    <span>Errors</span>
    <ul class="ml-3 list-inside list-disc space-y-1 text-sm font-light">
      {#each errors as error}
        <li transition:slide>{error}</li>
      {/each}
    </ul>
  </div>
{/if}
