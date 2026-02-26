<script lang="ts">
  import { LogInIcon, LogOutIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { scoutStore, teamStore, webRtcActiveStore, webRtcRoomIdStore } from "$lib/settings";

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
  <h2 class="font-bold">{onlineTransfer.localId ? "Room" : "Join a room"}</h2>
{/if}

{#if onlineTransfer.localId}
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
      Others <span class="text-xs tracking-tighter">({onlineTransfer.remoteClients.length})</span>
    </span>
    {#each onlineTransfer.remoteClients as client (client.info.id)}
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

  <div class="flex flex-wrap justify-between gap-2">
    <Button onclick={leaveRoom}>
      <LogOutIcon class="text-theme" />
      Leave
    </Button>
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

  <div class="flex flex-wrap justify-between gap-2">
    <Button onclick={joinRoom} class="font-bold">
      <LogInIcon class="text-theme" />
      Join
    </Button>
  </div>

  {#if error}
    <span>Error: {error}</span>
  {/if}
{/if}
