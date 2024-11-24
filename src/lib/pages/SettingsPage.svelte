<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { openDialog } from "$lib/dialog";
  import EditTbaAuthKeyDialog from "$lib/dialogs/EditTbaAuthKeyDialog.svelte";
  import EditTeamSettingDialog from "$lib/dialogs/EditTeamSettingDialog.svelte";
  import PickCameraDialog from "$lib/dialogs/PickCameraDialog.svelte";
  import { modes, modeStore, targets, targetStore, tbaAuthKeyStore, teamStore } from "$lib/settings";
</script>

<div class="flex flex-col gap-2">
  <label class="flex flex-col self-start">
    Mode
    <select bind:value={$modeStore} class="bg-neutral-800 p-2 capitalize text-theme">
      {#each modes as mode}
        <option>{mode}</option>
      {/each}
    </select>
  </label>
  <label class="flex flex-col self-start">
    Target
    <select bind:value={$targetStore} disabled={$modeStore == "scout"} class="bg-neutral-800 p-2 capitalize text-theme">
      {#each targets as target}
        <option>{target}</option>
      {/each}
    </select>
  </label>
</div>

{#if $modeStore == "admin"}
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Camera</h2>
    <Button onclick={() => openDialog(PickCameraDialog, {})}>
      <Icon name="camera" />
      Pick camera
    </Button>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">The Blue Alliance</h2>
    {#if $tbaAuthKeyStore}
      <Button onclick={() => openDialog(EditTeamSettingDialog, {})}>
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
    {/if}
    <Button onclick={() => openDialog(EditTbaAuthKeyDialog, {})}>
      <Icon name="key" />
      {#if $tbaAuthKeyStore}
        <div class="flex flex-col">
          ********
          <small>Edit API auth key</small>
        </div>
      {:else}
        Add API auth key
      {/if}
    </Button>
  </div>
{/if}
