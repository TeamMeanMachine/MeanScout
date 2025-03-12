<script lang="ts">
  import type { Match } from "$lib";
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

<span>Edit match {changes.number}</span>

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
  <Trash2Icon class="text-theme" />
  Delete
</Button>

{#if error}
  <span>Error: {error}</span>
{/if}
