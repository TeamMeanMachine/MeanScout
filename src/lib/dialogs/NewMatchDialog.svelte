<script lang="ts">
  import type { Match } from "$lib";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    oncreate,
  }: {
    surveyRecord: IDBRecord<Survey>;
    oncreate: (match: Match) => void;
  } = $props();

  let match = $state<Match>({
    number: 1 + Math.max(0, ...surveyRecord.matches.map((m) => m.number)),
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

      if (!match.red1.trim()) {
        error = "invalid value for red 1!";
        return;
      }
      if (!match.red2.trim()) {
        error = "invalid value for red 2!";
        return;
      }
      if (!match.red3.trim()) {
        error = "invalid value for red 3!";
        return;
      }

      if (!match.blue1.trim()) {
        error = "invalid value for blue 1!";
        return;
      }
      if (!match.blue2.trim()) {
        error = "invalid value for blue 2!";
        return;
      }
      if (!match.blue3.trim()) {
        error = "invalid value for blue 3!";
        return;
      }

      oncreate(match);
      closeDialog();
    },
  };
</script>

<span>New match</span>

<label class="flex flex-col">
  Number
  <input type="number" pattern="[0-9]*" bind:value={match.number} class="bg-neutral-800 p-2 text-theme" />
</label>

<div class="flex gap-2">
  <label class="flex flex-col">
    Red 1
    <input maxlength="5" bind:value={match.red1} class="w-full bg-neutral-800 p-2 text-red" />
  </label>
  <label class="flex flex-col">
    Red 2
    <input maxlength="5" bind:value={match.red2} class="w-full bg-neutral-800 p-2 text-red" />
  </label>
  <label class="flex flex-col">
    Red 3
    <input maxlength="5" bind:value={match.red3} class="w-full bg-neutral-800 p-2 text-red" />
  </label>
</div>

<div class="flex gap-2">
  <label class="flex flex-col">
    Blue 1
    <input maxlength="5" bind:value={match.blue1} class="w-full bg-neutral-800 p-2 text-blue" />
  </label>
  <label class="flex flex-col">
    Blue 2
    <input maxlength="5" bind:value={match.blue2} class="w-full bg-neutral-800 p-2 text-blue" />
  </label>
  <label class="flex flex-col">
    Blue 3
    <input maxlength="5" bind:value={match.blue3} class="w-full bg-neutral-800 p-2 text-blue" />
  </label>
</div>

{#if error}
  <span>Error: {error}</span>
{/if}
