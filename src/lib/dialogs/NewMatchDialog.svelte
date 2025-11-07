<script lang="ts">
  import { compareMatches, type Match, matchLevels } from "$lib";
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    matches,
    oncreate,
  }: {
    matches: Match[];
    oncreate: (match: Match) => void;
  } = $props();

  const lastMatch = matches.toSorted(compareMatches).at(-1);

  let match = $state<Match>({
    number: 1 + (lastMatch?.number || 0),
    set: lastMatch?.set || undefined,
    level: lastMatch?.level,
    red1: "",
    red2: "",
    red3: "",
    blue1: "",
    blue2: "",
    blue3: "",
  });

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      const number = parseFloat(`${match.number}`);
      if (Number.isNaN(number) || !Number.isInteger(number) || number < 1 || number > 999) {
        error = "invalid match number!";
        return;
      }

      if (match.set == 1) {
        match.set = undefined;
      } else if (match.set != undefined) {
        const set = parseFloat(`${match.set}`);
        if (Number.isNaN(set) || !Number.isInteger(set) || set < 1 || set > 999) {
          error = "invalid set number";
          return;
        }
      }

      if (match.level == "qm") {
        match.level = undefined;
      } else if (match.level && !matchLevels.includes(match.level)) {
        error = "invalid match level";
        return;
      }

      match.red1 = match.red1.trim();
      match.red2 = match.red2.trim();
      match.red3 = match.red3.trim();
      match.blue1 = match.blue1.trim();
      match.blue2 = match.blue2.trim();
      match.blue3 = match.blue3.trim();

      if (!match.red1) {
        error = "invalid value for red 1!";
        return;
      }
      if (!match.red2) {
        error = "invalid value for red 2!";
        return;
      }
      if (!match.red3) {
        error = "invalid value for red 3!";
        return;
      }

      if (!match.blue1) {
        error = "invalid value for blue 1!";
        return;
      }
      if (!match.blue2) {
        error = "invalid value for blue 2!";
        return;
      }
      if (!match.blue3) {
        error = "invalid value for blue 3!";
        return;
      }

      oncreate(match);
      closeDialog();
    },
  };
</script>

<span>New match</span>

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
    <input maxlength="5" bind:value={match.red1} class="text-red w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Red 2
    <input maxlength="5" bind:value={match.red2} class="text-red w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Red 3
    <input maxlength="5" bind:value={match.red3} class="text-red w-full bg-neutral-800 p-2" />
  </label>
</div>

<div class="flex gap-2">
  <label class="flex flex-col">
    Blue 1
    <input maxlength="5" bind:value={match.blue1} class="text-blue w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Blue 2
    <input maxlength="5" bind:value={match.blue2} class="text-blue w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Blue 3
    <input maxlength="5" bind:value={match.blue3} class="text-blue w-full bg-neutral-800 p-2" />
  </label>
</div>

<div class="flex gap-2">
  <label class="flex flex-col">
    Red Score
    <input maxlength="3" bind:value={match.redScore} class="text-red w-full bg-neutral-800 p-2" />
  </label>
  <label class="flex flex-col">
    Blue Score
    <input maxlength="3" bind:value={match.blueScore} class="text-blue w-full bg-neutral-800 p-2" />
  </label>
</div>

{#if error}
  <span>Error: {error}</span>
{/if}
