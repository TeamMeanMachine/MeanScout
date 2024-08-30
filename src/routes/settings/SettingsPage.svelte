<script lang="ts">
  import Header from "$lib/components/Header.svelte";
  import { modes, modeStore, targets, targetStore, tbaAuthKeyStore } from "$lib/settings";
  import EditTbaAuthKeyDialog from "./EditTbaAuthKeyDialog.svelte";
  import EditTeamSettingDialog from "./EditTeamSettingDialog.svelte";
</script>

<Header backLink="">
  <h1 class="font-bold">Settings</h1>
</Header>

<div class="flex flex-col gap-2 p-3">
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
  <div class="flex flex-col gap-2 p-3">
    <h2 class="font-bold">The Blue Alliance</h2>
    {#if $tbaAuthKeyStore}
      <EditTeamSettingDialog />
    {/if}
    <EditTbaAuthKeyDialog />
  </div>
{/if}
