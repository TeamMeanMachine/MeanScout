<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { teamStore } from "$lib/settings";

  let teamInput = $state($teamStore);
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      teamInput = teamInput.trim();
      if (teamInput && !/^\d{1,5}[A-Z]?$/.test(teamInput)) {
        error = "invalid team!";
        return;
      }

      $teamStore = teamInput;
      closeDialog();
    },
  };
</script>

<span>{$teamStore ? "Edit" : "Add"} team</span>

<input bind:value={teamInput} class="bg-neutral-800 p-2 text-theme" />

{#if error}
  <span>Error: {error}</span>
{/if}
