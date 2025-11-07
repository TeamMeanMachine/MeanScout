<script lang="ts">
  import { matchLevels, type Match } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, openDialog, type DialogExports } from "$lib/dialog";
  import { Trash2Icon } from "@lucide/svelte";
  import DeleteMatchDialog from "./DeleteMatchDialog.svelte";

  let {
    match,
    onupdate,
    ondelete,
  }: {
    match: Match;
    onupdate: (match: Match) => void;
    ondelete: () => void;
  } = $props();

  let changes = $state(structuredClone($state.snapshot(match)));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      const number = parseFloat(`${changes.number}`);
      if (Number.isNaN(number) || !Number.isInteger(number) || number < 1 || number > 999) {
        error = "invalid match number!";
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
        error = "invalid value for red 1!";
        return;
      }

      if (!changes.red2) {
        error = "invalid value for red 2!";
        return;
      }

      if (!changes.red3) {
        error = "invalid value for red 3!";
        return;
      }

      if (!changes.blue1) {
        error = "invalid value for blue 1!";
        return;
      }

      if (!changes.blue2) {
        error = "invalid value for blue 2!";
        return;
      }

      if (!changes.blue3) {
        error = "invalid value for blue 3!";
        return;
      }

      onupdate(changes);
      closeDialog();
    },
  };
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <span>
    Edit match
    {#if match.level && match.level != "qm"}
      {match.level}{match.set || 1}-{match.number}
    {:else}
      {match.number}
    {/if}
  </span>
  <Button
    onclick={() =>
      openDialog(DeleteMatchDialog, {
        number: match.number,
        ondelete() {
          ondelete();
          closeDialog();
        },
      })}
  >
    <Trash2Icon class="text-theme size-5" />
  </Button>
</div>

<div class="flex gap-2">
  <label class="flex w-full flex-col">
    Number
    <input
      type="number"
      pattern="[0-9]*"
      min="1"
      bind:value={match.number}
      class="text-theme w-full bg-neutral-800 p-2"
    />
  </label>
  <label class="flex w-full flex-col">
    Set
    <input
      type="number"
      pattern="[0-9]*"
      min="1"
      bind:value={match.set}
      placeholder="1"
      class="text-theme w-full bg-neutral-800 p-2"
    />
  </label>
  <label class="flex w-full flex-col">
    Level
    <select bind:value={match.level} class="text-theme w-full bg-neutral-800 p-2">
      {#each matchLevels as level}
        <option value={level}>{level}</option>
      {/each}
    </select>
  </label>
</div>

<div class="flex gap-2">
  <label class="flex flex-col">
    Red 1
    <input maxlength="5" bind:value={changes.red1} class="text-red w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Red 2
    <input maxlength="5" bind:value={changes.red2} class="text-red w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Red 3
    <input maxlength="5" bind:value={changes.red3} class="text-red w-full bg-neutral-800 p-2" />
  </label>
</div>

<div class="flex gap-2">
  <label class="flex flex-col">
    Blue 1
    <input maxlength="5" bind:value={changes.blue1} class="text-blue w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Blue 2
    <input maxlength="5" bind:value={changes.blue2} class="text-blue w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Blue 3
    <input maxlength="5" bind:value={changes.blue3} class="text-blue w-full bg-neutral-800 p-2" />
  </label>
</div>

<div class="flex gap-2">
  <label class="flex flex-col">
    Red Score
    <input maxlength="3" bind:value={changes.redScore} class="text-red w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Blue Score
    <input maxlength="3" bind:value={changes.blueScore} class="text-blue w-full bg-neutral-800 p-2" />
  </label>
</div>

{#if error}
  <span>Error: {error}</span>
{/if}
