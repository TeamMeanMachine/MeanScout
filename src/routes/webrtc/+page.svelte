<script lang="ts">
  import { ArrowLeftIcon, ChevronsLeftRightEllipsisIcon, UnplugIcon } from "@lucide/svelte";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { scoutStore, teamStore, webRtcRoomIdStore } from "$lib/settings";

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
    teamInput = teamInput.trim();
    roomIdInput = roomIdInput.trim();
    if (!roomIdInput) {
      error = "No room id";
      return;
    }
    $scoutStore = scoutInput;
    $teamStore = teamInput;
    $webRtcRoomIdStore = roomIdInput;

    onlineTransfer.joinRoom({ room: roomIdInput, name: scoutInput, team: teamInput });
  }

  function leaveRoom() {
    onlineTransfer.leaveRoom();
  }
</script>

<Header
  title="{onlineTransfer.signaling ? 'Room' : 'Join Room'} - MeanScout"
  heading={onlineTransfer.signaling ? "Room" : "Join Room"}
  {backLink}
  class="max-w-(--breakpoint-sm)"
/>

<div class="mx-auto mt-[69px] mb-3 flex w-full max-w-(--breakpoint-sm) grow flex-col gap-6 p-3">
  {#if onlineTransfer.signaling}
    {@const localClient = onlineTransfer.signaling.clients.find((c) => c.id == onlineTransfer.signaling?.localId)}

    {#if localClient}
      <div class="flex flex-col">
        <h2 class="font-bold">You</h2>
        <span>
          {localClient.name}
          {#if localClient.team}
            <span class="text-xs font-light">({localClient.team})</span>
          {/if}
        </span>
      </div>
    {/if}

    {#if onlineTransfer.signaling.clients.length}
      <span>{onlineTransfer.signaling.clients.length} clients</span>
    {/if}

    {#each onlineTransfer.signaling.clients.filter((c) => c.id !== onlineTransfer.signaling?.localId) as client (client.id)}
      <div class="flex flex-col">
        <span>
          {#if onlineTransfer.signaling.localId == client.id}
            <span class="text-xs font-light">(you)</span>
          {/if}
          {client.name}
          {#if client.team}
            <span class="text-xs font-light">({client.team})</span>
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
