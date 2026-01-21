import { dev } from "$app/environment";
// @ts-ignore
import SP from "simple-peer/simplepeer.min.js";

type SimplePeer = import("simple-peer").Instance;
type SimplePeerOptions = import("simple-peer").Options;

type ClientInfo = { id: string; name?: string; team?: string };

type InboundMessage =
  | { type: "join"; id: string; clients: ClientInfo[] }
  | { type: "clients"; clients: ClientInfo[] }
  | { type: "info"; info: ClientInfo }
  | { type: "signal"; from: string; data: any }
  | { type: "leave"; id: string }
  | { type: "error"; error: string };

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

class OnlineTransfer {
  ws: WebSocket | undefined = undefined;
  signaling = $state<{ clients: ClientInfo[]; localId: string } | undefined>();
  connections = $state(new Map<string, SimplePeer>());

  joinRoom({ room, name, team }: { room: string; name: string; team: string }) {
    const url = new URL(SIGNALING_SERVER_URL);

    url.searchParams.set("room", room);
    if (name) {
      url.searchParams.set("name", name);
    }
    if (team) {
      url.searchParams.set("team", team);
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("websocket opened");
    };

    ws.onerror = (error) => {
      console.error("websocket error", error);
    };

    ws.onclose = () => {
      console.log("websocket was closed");
      ws.close();
      this.ws = undefined;
      this.signaling = undefined;
      this.clearConnections();
    };

    ws.onmessage = ({ data }) => this.handleMessage(ws, data);
  }

  leaveRoom() {
    console.log("websocket closed manually");
    this.ws?.close();
    this.ws = undefined;
    this.signaling = undefined;
    this.clearConnections();
  }

  private handleMessage(ws: WebSocket, data: WebSocketEventMap["message"]["data"]) {
    if (typeof data !== "string") {
      console.error("Invalid message received: not a string");
      return;
    }

    let message: InboundMessage;

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
      this.signaling = { clients: [], localId: message.id };
      this.ws = ws;

      for (const client of message.clients) {
        this.addClient(client);
        if (client.id == message.id) continue;
        const newConnection = this.connectToClient(client.id, { initiator: true });
        this.connections.set(client.id, newConnection);
      }

      return;
    }

    if (!this.signaling) {
      console.error("Waiting for 'join' message");
      return;
    }

    switch (message.type) {
      case "clients":
        for (const newClient of message.clients) {
          if (newClient.id == this.signaling.localId) continue;

          const existingClient = this.signaling.clients.find((c) => c.id == newClient.id);

          if (existingClient) {
            existingClient.id = newClient.id;
            existingClient.name = newClient.name;
            existingClient.team = newClient.team;
          } else {
            this.addClient(newClient);

            if (!this.connections.has(newClient.id)) {
              const newConnection = this.connectToClient(newClient.id, { initiator: true });
              this.connections.set(newClient.id, newConnection);
            }
          }
        }
        break;
      case "info":
        // The new client will initiate a peer connection with us,
        // so we just add the info.
        this.addClient(message.info);
        break;
      case "signal":
        let connection = this.connections.get(message.from);
        if (!connection) {
          connection = this.connectToClient(message.from);
          this.connections.set(message.from, connection);
        }
        connection.signal(message.data);
        break;
      case "leave":
        this.removeClient(message.id);
        this.connections.get(message.id)?.destroy();
        this.connections.delete(message.id);
        break;
    }
  }

  private addClient(client: ClientInfo) {
    if (!this.signaling) return;
    const existingClient = this.signaling.clients.find((c) => c.id == client.id);
    if (existingClient) {
      existingClient.name = client.name;
      existingClient.team = client.team;
    } else {
      this.signaling.clients.push(client);
    }
  }

  private removeClient(id: string) {
    if (!this.signaling) return;
    this.signaling.clients = this.signaling?.clients.filter((c) => c.id !== id);
  }

  private connectToClient(id: string, options?: SimplePeerOptions) {
    if (!this.signaling) throw new Error("Signaling server not initialized");

    const newConnection: SimplePeer = new SP({
      ...options,
      config: { iceServers: ICE_SERVERS },
    } satisfies SimplePeerOptions);

    newConnection.on("signal", (data) => {
      if (!this.ws) throw new Error("WebSocket not initialized");
      this.ws.send(JSON.stringify({ type: "signal", to: id, data }));
    });

    newConnection.on("connect", () => {
      if (!this.signaling) throw new Error("Signaling server not initialized");
      newConnection.send(`Hello from peer ${this.signaling.localId}`);
    });

    newConnection.on("data", (data) => {
      console.log(new TextDecoder().decode(data));
    });

    return newConnection;
  }

  private clearConnections() {
    for (const [, connection] of this.connections) {
      connection.destroy();
    }
    this.connections.clear();
  }
}

export const onlineTransfer = new OnlineTransfer();
