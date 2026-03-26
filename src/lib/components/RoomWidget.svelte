<script lang="ts">
  import { LogInIcon, LogOutIcon, SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import {
    scoutStore,
    teamStore,
    webRtcActiveStore,
    webRtcAutoReceiveStore,
    webRtcAutoSendStore,
    webRtcRoomIdStore,
  } from "$lib/settings";

  let {
    hideTitle,
  }: {
    hideTitle?: boolean;
  } = $props();

  const MAX_NAME_LENGTH = 32;
  const MAX_TEAM_LENGTH = 6;

  let scoutInput = $state($scoutStore);
  let teamInput = $state($teamStore);
  let roomIdInput = $state($webRtcRoomIdStore);
  let error = $state("");

  function joinRoom() {
    scoutInput = scoutInput.trim();
    if (!scoutInput) {
      error = "No name";
      return;
    }
    if (scoutInput.length > MAX_NAME_LENGTH) {
      error = `Name is too long (>${MAX_NAME_LENGTH} characters)`;
      return;
    }

    teamInput = teamInput.trim();
    if (teamInput.length > MAX_TEAM_LENGTH) {
      error = `Team is too long (>${MAX_TEAM_LENGTH} characters)`;
      return;
    }

    roomIdInput = roomIdInput.trim();
    if (!roomIdInput) {
      error = "No room id";
      return;
    }

    $scoutStore = scoutInput;
    $teamStore = teamInput;
    $webRtcRoomIdStore = roomIdInput;
    $webRtcActiveStore = "true";

    onlineTransfer.joinRoom({ room: roomIdInput, name: scoutInput, team: teamInput });
  }

  function leaveRoom() {
    $webRtcActiveStore = "";
    onlineTransfer.leaveRoom();
  }
</script>

{#if !hideTitle}
  <h2 class="font-bold">{$webRtcActiveStore ? "Room" : "Join a room"}</h2>
{/if}

<div class="-m-1 flex h-[400px] flex-col gap-3 overflow-auto p-1">
  {#if $webRtcActiveStore}
    <div class="flex flex-col">
      <span class="text-sm font-light">You</span>
      <span>
        {$scoutStore}
        {#if $teamStore}
          <span class="text-xs font-light">({$teamStore})</span>
        {/if}
      </span>
    </div>

    <div class="flex flex-col">
      <span class="text-sm font-light">
        Others <span class="text-xs tracking-tighter">({onlineTransfer.clients.length})</span>
      </span>
      {#each onlineTransfer.clients as client (client.info.id)}
        <div class="flex flex-col">
          <span>
            {client.info.name}
            {#if client.info.team}
              <span class="text-xs font-light">({client.info.team})</span>
            {/if}
          </span>
        </div>
      {:else}
        <span class="text-sm font-light">Nobody else is active in this room.</span>
      {/each}
    </div>
  {:else}
    <label class="flex flex-col">
      Your name
      <input bind:value={scoutInput} class="bg-neutral-800 p-2 text-theme" />
    </label>

    <label class="flex flex-col">
      Your team
      <input bind:value={teamInput} class="bg-neutral-800 p-2 text-theme" />
    </label>

    <label class="flex flex-col">
      Room id
      <input bind:value={roomIdInput} class="bg-neutral-800 p-2 text-theme" />
    </label>
  {/if}
</div>

<Button onclick={() => ($webRtcAutoReceiveStore = $webRtcAutoReceiveStore ? "" : "new-entries")}>
  {#if $webRtcAutoReceiveStore}
    <SquareCheckBigIcon class="text-theme" />
  {:else}
    <SquareIcon class="text-theme" />
  {/if}
  <div class={["flex flex-col", $webRtcAutoReceiveStore ? "font-bold" : "font-light"]}>
    Auto-receive
    <span class="text-xs font-light">New entries</span>
  </div>
</Button>

{#if $webRtcActiveStore}
  <Button onclick={leaveRoom}>
    <LogOutIcon class="text-theme" />
    Leave
  </Button>
{:else}
  <Button onclick={joinRoom} class="font-bold">
    <LogInIcon class="text-theme" />
    Join
  </Button>
{/if}

{#if error}
  <span>Error: {error}</span>
{/if}
