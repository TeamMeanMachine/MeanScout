<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { scoutStore, teamStore, webRtcActiveStore, webRtcRoomIdStore } from "$lib/settings";
  import { roomState } from "$lib/webrtc.svelte";

  const backLink = sessionStorage.getItem("home") || "";

  let scoutInput = $state($scoutStore);
  let teamInput = $state($teamStore);
  let roomIdInput = $state($webRtcRoomIdStore);
  let error = $state("");

  async function joinRoom() {
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

    roomState
      .joinRoom(roomIdInput, scoutInput, { name: scoutInput, team: teamInput })
      .then(() => {
        $webRtcActiveStore = "true";
      })
      .catch((reason) => {
        error = reason;
      });
  }

  async function leaveRoom() {
    $webRtcActiveStore = "";
    roomState.leaveRoom().catch((reason) => {
      error = reason;
    });
  }
</script>

<Header title="WebRTC - MeanScout" heading="WebRTC" {backLink} />

<div class="mx-auto mt-[69px] mb-3 flex w-full max-w-(--breakpoint-sm) grow flex-col gap-6 p-3">
  {#if roomState.joined}
    <div class="flex flex-col">
      <h2 class="font-bold">Room</h2>
      Id: {roomState.id}
    </div>

    <div class="flex flex-col">
      Peers:
      {#if roomState.peers.length}
        <ul>
          {#each roomState.peers as peer}
            <li>{peer.id} - {peer.info.name} - {peer.info.team}</li>
          {/each}
        </ul>
      {:else}
        <span class="text-xs font-light">No peers.</span>
      {/if}
    </div>

    <div class="flex flex-col">
      Messages:
      {#if roomState.messages.length}
        <ul>
          {#each roomState.messages as message}
            <li>{message.type} - {message.peerId} -> {message.toPeerId} - {message.delivered ? "delivered" : ""}</li>
          {/each}
        </ul>
      {:else}
        <span class="text-xs font-light">No messages.</span>
      {/if}
    </div>

    <Button onclick={leaveRoom} class="self-start">Leave</Button>
  {:else}
    <h2 class="font-bold">Join room</h2>

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

    <Button onclick={joinRoom} class="self-start">Join</Button>

    {#if error}
      <span>Error: {error}</span>
    {/if}
  {/if}
</div>
