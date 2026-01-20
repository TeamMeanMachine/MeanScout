<script lang="ts">
  import { dev } from "$app/environment";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { scoutStore, teamStore, webRtcRoomIdStore } from "$lib/settings";
  // @ts-ignore
  import SP from "simple-peer/simplepeer.min.js";

  type SimplePeer = import("simple-peer").Instance;
  type SimplePeerOptions = import("simple-peer").Options;

  type ClientInfo = { id: string; name?: string; team?: string };

  const SIGNALING_SERVER_URL = dev ? "http://localhost:8787" : "https://meanscout-webrtc.aidunlin.workers.dev";
  const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  const backLink = sessionStorage.getItem("home") || "";

  let scoutInput = $state($scoutStore);
  let teamInput = $state($teamStore);
  let roomIdInput = $state($webRtcRoomIdStore);
  let error = $state("");

  let signaling = $state<{ ws: WebSocket; clients: Map<string, ClientInfo>; id: string } | undefined>();
  let connections = $state(new Map<string, import("simple-peer").Instance>());

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

    const url = new URL(SIGNALING_SERVER_URL);

    url.searchParams.set("room", roomIdInput);
    if (scoutInput) {
      url.searchParams.set("name", scoutInput);
    }
    if (teamInput) {
      url.searchParams.set("team", teamInput);
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("websocket opened");
    };

    ws.onerror = (error) => {
      console.error("websocket error", error);
    };

    ws.onclose = () => {
      console.log("closing websocket");
      signaling = undefined;
    };

    ws.onmessage = ({ data }) => {
      if (typeof data !== "string") {
        console.error("Invalid message received: not a string");
        return;
      }

      let message:
        | { type: "join"; id: string; clients: ClientInfo[] }
        | { type: "clients"; clients: ClientInfo[] }
        | { type: "info"; info: ClientInfo }
        | { type: "signal"; from: string; data: any }
        | { type: "leave"; id: string }
        | { type: "error"; error: string };

      try {
        message = JSON.parse(data);
      } catch {
        console.error("Invalid message: could not be parsed");
        return;
      }

      console.log(message);

      if (typeof message !== "object") {
        console.error("Invalid message parsed: not an object");
        return;
      }

      if (!message.type) {
        console.error("Missing message 'type' prop");
        return;
      }

      if (message.type == "error") {
        console.error(`Error received: ${message.error}`);
        return;
      }

      if (message.type == "join") {
        signaling = { ws, clients: new Map(), id: message.id };

        for (const client of message.clients) {
          if (client.id == message.id) continue;

          signaling.clients.set(client.id, client);
          const newConnection = connectToClient(client.id, { initiator: true });
          connections.set(client.id, newConnection);
        }

        return;
      }

      if (!signaling) {
        console.error("Waiting for 'join' message");
        return;
      }

      switch (message.type) {
        case "clients":
          for (const newClient of message.clients) {
            if (newClient.id == signaling.id) continue;

            const existingClient = signaling.clients.get(newClient.id);

            if (existingClient) {
              existingClient.id = newClient.id;
              existingClient.name = newClient.name;
              existingClient.team = newClient.team;
            } else {
              signaling.clients.set(newClient.id, newClient);

              if (!connections.has(newClient.id)) {
                const newConnection = connectToClient(newClient.id, { initiator: true });
                connections.set(newClient.id, newConnection);
              }
            }
          }
          break;
        case "info":
          signaling.clients.set(message.info.id, message.info);
          break;
        case "signal":
          let connection = connections.get(message.from);
          if (!connection) {
            connection = connectToClient(message.from);
            connections.set(message.from, connection);
          }
          connection.signal(message.data);
          break;
        case "leave":
          signaling.clients.delete(message.id);
          connections.get(message.id)?.destroy();
          connections.delete(message.id);
          break;
      }
    };
  }

  function connectToClient(id: string, options?: SimplePeerOptions) {
    if (!signaling) throw new Error("Signaling server not initialized");

    const newConnection: SimplePeer = new SP({
      ...options,
      config: { iceServers: ICE_SERVERS },
    } satisfies SimplePeerOptions);

    newConnection.on("signal", (data) => {
      if (!signaling) throw new Error("Signaling server not initialized");
      signaling.ws.send(JSON.stringify({ type: "signal", to: id, data }));
    });

    newConnection.on("connect", () => {
      if (!signaling) throw new Error("Signaling server not initialized");
      newConnection.send(`Hello from peer ${signaling.id}`);
    });

    newConnection.on("data", (data) => {
      console.log(data);
    });

    return newConnection;
  }

  async function leaveRoom() {
    signaling?.ws.close();
    signaling = undefined;
  }
</script>

<Header title="WebRTC - MeanScout" heading="WebRTC" {backLink} />

<div class="mx-auto mt-[69px] mb-3 flex w-full max-w-(--breakpoint-sm) grow flex-col gap-6 p-3">
  {#if signaling}
    <div class="flex flex-col">
      <h2 class="font-bold">Room</h2>
      <span class="text-xs font-light">({$webRtcRoomIdStore})</span>
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
