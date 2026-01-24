<script lang="ts">
  import { ChevronsLeftRightEllipsisIcon, UnplugIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { scoutStore, teamStore, webRtcActiveStore, webRtcRoomIdStore } from "$lib/settings";

  const MAX_NAME_LENGTH = 32;
  const MAX_TEAM_LENGTH = 6;

  const backLink = sessionStorage.getItem("home") || "";

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

<Header
  title="{onlineTransfer.localId ? 'Room' : 'Join Room'} - MeanScout"
  heading={onlineTransfer.localId ? "Room" : "Join Room"}
  {backLink}
  class="max-w-(--breakpoint-sm)"
/>

<div class="mx-auto mt-[69px] mb-3 flex w-full max-w-(--breakpoint-sm) grow flex-col gap-6 p-3">
  {#if onlineTransfer.localId}
    {@const clientCount = onlineTransfer.clients.size}
    {@const localClient = onlineTransfer.clients.get(onlineTransfer.localId)}

    {#if clientCount}
      <span>{clientCount} {clientCount == 1 ? "peer" : "peers"}</span>
    {/if}

    {#if localClient}
      <div class="flex flex-col">
        <h2 class="font-bold">You</h2>
        <span>
          {localClient.info.name}
          {#if localClient.info.team}
            <span class="text-xs font-light">({localClient.info.team})</span>
          {/if}
        </span>
      </div>
    {/if}

    {#each onlineTransfer.clients
      .values()
      .filter((c) => c.info.id !== onlineTransfer.localId) as client (client.info.id)}
      <div class="flex flex-col">
        <span>
          {client.info.name}
          {#if client.info.team}
            <span class="text-xs font-light">({client.info.team})</span>
          {/if}
        </span>
      </div>
    {/each}

    <div class="flex flex-wrap justify-between gap-2">
      <Button onclick={leaveRoom}>
        <UnplugIcon class="text-theme" />
        Leave room
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
        <ChevronsLeftRightEllipsisIcon class="text-theme" />
        Join
      </Button>
    </div>

    {#if error}
      <span>Error: {error}</span>
    {/if}
  {/if}
</div>
