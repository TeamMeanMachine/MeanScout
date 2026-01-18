import { dev } from "$app/environment";
// @ts-ignore
import SP from "simple-peer/simplepeer.min.js";

type SimplePeer = import("simple-peer").Instance;
type SimplePeerOptions = import("simple-peer").Options;

type PeerInfo = {
  name: string;
  team: string;
};

/** Grouping of peers and messages between peers. */
export type Room = {
  id: string;
  peers: { id: string; info: { name: string; team: string }; lastUpdate: number }[];
  messages: StoredRtcMessage[];
  lastUpdate: number;
};

/** A message created by a client, to be sent to other clients. */
export type IncomingRtcMessage = {
  type: "signal";
  roomId: string;
  peerId: string;
  toPeerId: string;
  data: any;
  delivered?: boolean | undefined;
};

/** Excludes redundant room id. */
export type StoredRtcMessage = Omit<IncomingRtcMessage, "roomId">;

/** A message created by a client, sent to this server. */
export type ClientMessage =
  | IncomingRtcMessage
  | { type: "join"; roomId: string; peerId: string; peerInfo: { name: string; team: string } }
  | { type: "leave"; roomId: string; peerId: string };

/** A message created by this server, to be sent to a client. */
export type ServerMessage = { type: "room"; room: Room } | { type: "ok" } | { type: "error"; error: string };

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
const POLL_INTERVAL = 1000 * 5;

class RoomState {
  private _room = $state<Room | undefined>(undefined);
  private _peerId = "";
  private _intervalId: number | undefined = undefined;
  private _connections = new Map<string, import("simple-peer").Instance>();

  async joinRoom(roomId: string, peerId: string, peerInfo: PeerInfo) {
    const response = await fetch(SIGNALING_SERVER_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "join",
        roomId,
        peerId,
        peerInfo,
      } satisfies ClientMessage),
    });

    const message: ServerMessage = await response.json();

    if (message.type == "room") {
      this._room = message.room;
      this._peerId = peerId;
      this._startPoll();
      this._connectToPeers();
      return;
    }

    if (message.type == "error") {
      console.error("error while joining:", message.error);
      return;
    }

    if (!response.ok) {
      console.error("response not okay while joining", response);
      return;
    }
  }

  async leaveRoom() {
    this._stopPoll();
    for (const [id, connection] of this._connections) {
      console.log("destroying connection", id);
      connection.destroy();
    }
    this._connections.clear();
    if (!this._room) return;

    const response = await fetch(SIGNALING_SERVER_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "leave",
        roomId: this._room.id,
        peerId: this._peerId,
      } satisfies ClientMessage),
    });

    if (!response.ok) {
      console.error("response not okay while leaving", response);
    }

    this._room = undefined;
  }

  get joined() {
    return !!this._room;
  }

  get id() {
    if (!this._room) throw new Error("No room");
    return this._room.id;
  }

  get peers() {
    if (!this._room) throw new Error("No room");
    return $state.snapshot(this._room.peers);
  }

  get messages() {
    if (!this._room) throw new Error("No room");
    return $state.snapshot(this._room.messages);
  }

  private _startPoll() {
    if (this._intervalId) this._stopPoll();
    this._intervalId = window.setInterval(() => this._poll(), POLL_INTERVAL);
  }

  private _stopPoll() {
    window.clearInterval(this._intervalId);
    this._intervalId = undefined;
  }

  private async _poll() {
    if (!this._room) {
      this._stopPoll();
      throw new Error("No room");
    }

    const roomId = encodeURIComponent(this._room.id);
    const peerId = encodeURIComponent(this._peerId);
    const response = await fetch(`${SIGNALING_SERVER_URL}?roomId=${roomId}&peerId=${peerId}`);

    const message: ServerMessage = await response.json();

    if (message.type == "ok") {
      console.log("ok");
      return;
    }

    if (message.type == "error") {
      console.error("error while polling:", message.error);
      return;
    }
    if (!response.ok) {
      console.error("response not okay while polling", response);
      return;
    }

    for (const msg of message.room.messages) {
      if (msg.toPeerId == this._peerId) {
        const remotePeerId = msg.peerId;
        const existingConnection = this._connections.get(remotePeerId);

        console.log("received signal from", remotePeerId);
        if (existingConnection) {
          console.log("using existing connection for", remotePeerId);
          existingConnection.signal(msg.data);
          continue;
        }

        console.log("setting up connection for", remotePeerId);

        const newConnection: SimplePeer = new SP({
          config: { iceServers: ICE_SERVERS },
        } satisfies SimplePeerOptions);

        newConnection.on("error", (error) => {
          console.error(error);
        });

        newConnection.on("close", () => {
          console.log("closing", remotePeerId);
          this._connections.delete(remotePeerId);
        });

        newConnection.on("signal", async (data) => {
          console.log("signal ready, sending to", remotePeerId);
          const response = await fetch(SIGNALING_SERVER_URL, {
            method: "POST",
            body: JSON.stringify({
              type: "signal",
              roomId,
              peerId: this._peerId,
              toPeerId: remotePeerId,
              data,
            } satisfies ClientMessage),
          });

          const message: ServerMessage = await response.json();
          if (message.type == "error") {
            console.error(`error while sending signal to peer ${remotePeerId}`, message);
            return;
          }

          if (!response.ok) {
            console.error(`response not okay while sending signal to peer ${remotePeerId}`, response);
            return;
          }
        });

        newConnection.on("connect", () => {
          console.log("connected!");
          newConnection.send(`hello from peer ${this._peerId}`);
        });

        newConnection.on("data", (data) => {
          console.log(data);
        });

        newConnection.signal(msg.data);

        this._connections.set(remotePeerId, newConnection);
      }
    }

    this._room = message.room;
  }

  private _connectToPeers() {
    if (!this._room) throw new Error("No room");

    for (const peer of this._room.peers) {
      if (!this._connections.has(peer.id) && peer.id !== this._peerId) {
        this._connectToPeer(peer.id);
      }
    }
  }

  private async _connectToPeer(id: string) {
    if (!this._room) throw new Error("No room");
    const roomId = this._room.id;

    const connection: SimplePeer = new SP({
      initiator: true,
      config: { iceServers: ICE_SERVERS },
    } satisfies SimplePeerOptions);

    console.log("setting up connection for", id);

    connection.on("error", (error) => {
      console.error(error);
    });

    connection.on("close", () => {
      console.log("closing", id);
      this._connections.delete(id);
    });

    connection.on("signal", async (data) => {
      console.log("signal ready, sending to", id);
      const response = await fetch(SIGNALING_SERVER_URL, {
        method: "POST",
        body: JSON.stringify({
          type: "signal",
          roomId,
          peerId: this._peerId,
          toPeerId: id,
          data,
        } satisfies ClientMessage),
      });

      const message: ServerMessage = await response.json();
      if (message.type == "error") {
        console.error(`error while sending signal to peer ${id}`, message);
        return;
      }

      if (!response.ok) {
        console.error(`response not okay while sending signal to peer ${id}`, response);
        return;
      }
    });

    connection.on("connect", () => {
      console.log("connected!");
      connection.send(`hello from peer ${this._peerId}`);
    });

    connection.on("data", (data) => {
      console.log(data);
    });

    this._connections.set(id, connection);
  }
}

export const roomState = new RoomState();
