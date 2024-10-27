<script lang="ts">
  import type { Match } from "$lib";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { MatchSurvey } from "$lib/survey";

  let {
    surveyRecord,
    match: match,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    match: Match;
  } = $props();

  let changes = $state(structuredClone($state.snapshot(match)));
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (!changes.red1.trim()) {
        error = "invalid value for red 1!";
        return;
      }
      if (!changes.red2.trim()) {
        error = "invalid value for red 2!";
        return;
      }
      if (!changes.red3.trim()) {
        error = "invalid value for red 3!";
        return;
      }

      if (!changes.blue1.trim()) {
        error = "invalid value for blue 1!";
        return;
      }
      if (!changes.blue2.trim()) {
        error = "invalid value for blue 2!";
        return;
      }
      if (!changes.blue3.trim()) {
        error = "invalid value for blue 3!";
        return;
      }

      const index = surveyRecord.matches.findIndex((m) => m.number == changes.number);
      if (index >= 0) surveyRecord.matches[index] = structuredClone($state.snapshot(changes));
      surveyRecord.modified = new Date();
      closeDialog();
    },
  };
</script>

<span>Edit match {changes.number}</span>

<div class="flex gap-2">
  <label class="flex flex-col">
    Red 1
    <input maxlength="5" bind:value={changes.red1} class="w-full bg-neutral-800 p-2 text-red" />
  </label>
  <label class="flex flex-col">
    Red 2
    <input maxlength="5" bind:value={changes.red2} class="w-full bg-neutral-800 p-2 text-red" />
  </label>
  <label class="flex flex-col">
    Red 3
    <input maxlength="5" bind:value={changes.red3} class="w-full bg-neutral-800 p-2 text-red" />
  </label>
</div>

<div class="flex gap-2">
  <label class="flex flex-col">
    Blue 1
    <input maxlength="5" bind:value={changes.blue1} class="w-full bg-neutral-800 p-2 text-blue" />
  </label>
  <label class="flex flex-col">
    Blue 2
    <input maxlength="5" bind:value={changes.blue2} class="w-full bg-neutral-800 p-2 text-blue" />
  </label>
  <label class="flex flex-col">
    Blue 3
    <input maxlength="5" bind:value={changes.blue3} class="w-full bg-neutral-800 p-2 text-blue" />
  </label>
</div>

{#if error}
  <span>Error: {error}</span>
{/if}
