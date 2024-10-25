<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { teamStore } from "$lib/settings";

  let dialog: ReturnType<typeof Dialog>;
  let teamInput = $state($teamStore);
  let error = $state("");

  function onconfirm() {
    teamInput = teamInput.trim();
    if (teamInput && !/^\d{1,5}[A-Z]?$/.test(teamInput)) {
      error = "invalid team!";
      return;
    }

    $teamStore = teamInput;
    dialog.close();
  }

  function onclose() {
    teamInput = $teamStore;
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="user-group" />
  {#if $teamStore}
    <div class="flex flex-col">
      {$teamStore}
      <small>Edit team</small>
    </div>
  {:else}
    Add team
  {/if}
</Button>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  <span>
    {#if $teamStore}
      Edit team
    {:else}
      Add team
    {/if}
  </span>
  <input bind:value={teamInput} class="bg-neutral-800 p-2 text-theme" />
  {#if error}
    <span>Error: {error}</span>
  {/if}
</Dialog>
