import { serializeDate } from "#lib";
import { browser, dev } from "$app/env";
import { SvelteMap } from "svelte/reactivity";
import { get } from "svelte/store";
import { z } from "zod";
import { compress, decompress } from "./compress";
import type { AllData } from "./idb";
import { importSchema, mergeOldAndNewData, type ImportedData } from "./import.svelte";
import { matchIdentifierSchema } from "./match";
import { scoutStore, teamStore, webRtcActiveStore, webRtcForceFallbackStore, webRtcRoomIdStore } from "./settings";

const clientInfoSchema = z.object({ id: z.string(), name: z.string().optional(), team: z.string().optional() });
export type ClientInfo = z.infer<typeof clientInfoSchema>;

const scoutingStatusSchema = z.object({
  team: z.string(),
  match: matchIdentifierSchema.optional(),
  prediction: z.literal(["red", "blue"]).optional(),
});
export type ScoutingStatus = z.infer<typeof scoutingStatusSchema>;

const wsInboundMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("init"), id: z.string(), clients: z.array(clientInfoSchema) }),
  z.object({ type: z.literal("clients"), clients: z.array(clientInfoSchema) }),
  z.object({ type: z.literal("info"), info: clientInfoSchema }),
  z.object({ type: z.literal("offer"), from: z.string(), offer: z.any() }),
  z.object({ type: z.literal("answer"), from: z.string(), answer: z.any() }),
  z.object({ type: z.literal("candidates"), from: z.string(), candidates: z.any().array() }),
  z.object({ type: z.literal("leave"), id: z.string() }),
  z.object({ type: z.literal("error"), error: z.string() }),
  z.object({ type: z.literal("request"), from: z.string(), request: z.literal(["entries", "configs", "all"]) }),
  z.object({ type: z.literal("response"), from: z.string(), data: importSchema }),
  z.object({ type: z.literal("scouting"), from: z.string(), status: z.literal("done").or(scoutingStatusSchema) }),
]);
type WSInboundMessage = z.infer<typeof wsInboundMessageSchema>;

type WSOutboundMessage =
  | { type: "info"; info: { name: string; team: string } }
  | { type: "offer"; to: string; offer: RTCSessionDescription | null }
  | { type: "answer"; to: string; answer: RTCSessionDescription | null }
  | { type: "candidates"; candidates: Record<string, (RTCIceCandidate | null)[]> }
  | { type: "request"; to?: string[]; request: "entries" | "configs" | "all" }
  | { type: "response"; to?: string[]; data: ImportedData }
  | { type: "scouting"; to?: string[]; status: "done" | ScoutingStatus };

const rtcMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("request"), request: z.literal(["entries", "configs", "all"]) }),
  z.object({ type: z.literal("response"), data: importSchema }),
  z.object({ type: z.literal("candidates"), candidates: z.any().array() }),
  z.object({ type: z.literal("scouting"), status: z.literal("done").or(scoutingStatusSchema) }),
]);
export type RTCMessage = z.infer<typeof rtcMessageSchema>;

/** Contains everything about a client: basic metadata such as id and name, and potentially an active connection/channel. */
type Client = {
  info: ClientInfo;
  /** May or may not exist or be ready for RTC data transfer. */
  connection?: RTCPeerConnection;
  /** Should only exist when the client is ready for RTC data transfer. */
  channel?: RTCDataChannel;

  state: "connected" | undefined;
};

// Should maybe set up a developers settings page to control things like this.
// Or maybe a way to use the web app's deployed location hostname.
const LOCALHOST_SIGNALING_URL = new URL("http://" + location.hostname + ":8787");
const DEPLOYED_SIGNALING_URL = new URL("https://meanscout-webrtc.aidunlin.workers.dev");

const SIGNALING_SERVER_URL = dev ? LOCALHOST_SIGNALING_URL : DEPLOYED_SIGNALING_URL;
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

class OnlineTransfer {
  /** Connection to the signaling server. */
  private ws: WebSocket | undefined = undefined;
  state = $state<"connected">();

  /** Temporary list of batched outbound candidate messages. */
  private candidateBatch: {
    candidates: Record<string, (RTCIceCandidate | null)[]>;
    timer: number | undefined;
    timeout: number;
  } = { candidates: {}, timer: undefined, timeout: 100 };

  private forceFallback = false;

  /** This client's id, only set when connected to the signaling server. Reactive. */
  localId = $state<string | undefined>(undefined);

  localScoutingStatus = $state<ScoutingStatus | undefined>(undefined);

  /** Reactive list of remote clients. */
  clients = $state<Client[]>([]);

  /** Reactive map of any remote clients' requests. */
  requestsFromClients = $state(new SvelteMap<string, "entries" | "configs" | "all">());

  /** Reactive map of any remote clients' data. */
  dataFromClients = $state(new SvelteMap<string, AllData>());

  /** Reactive map of clients' scouting status, updated on preparing/starting/stopping scouting. */
  clientsScoutingStatus = $state(new SvelteMap<string, ScoutingStatus>());

  /** Reactive counts of different requests. */
  requestCounts = $derived.by(() => {
    const messages = Object.groupBy(onlineTransfer.requestsFromClients.values(), (r) => r);
    return {
      entries: messages.entries?.length || 0,
      configs: messages.configs?.length || 0,
      all: messages.all?.length || 0,
    };
  });

  constructor() {
    if (!browser) return;
    document.addEventListener("visibilitychange", () => {
      const webRtcActive = get(webRtcActiveStore);
      if (document.hidden || !webRtcActive) return;

      if (this.ws?.readyState == WebSocket.OPEN) {
        const clientsToRestart: ClientInfo[] = [];

        this.clients = this.clients.filter((client) => {
          const webrtcLogLabel = `[webrtc-${client.info.id.slice(0, 8)}]`;
          if (client.connection?.connectionState == "connected" && client.channel?.readyState == "open") {
            return true;
          }

          console.log(webrtcLogLabel, "disconnected while app was hidden, will reconnect");
          client.channel?.close();
          client.connection?.close();
          clientsToRestart.push(client.info);
          return false;
        });

        for (const client of clientsToRestart) {
          this.addClient(client, { connectNow: true });
        }
      } else {
        console.log("[websocket] died while app was hidden");
        onlineTransfer.leaveRoom();

        const room = get(webRtcRoomIdStore);
        const name = get(scoutStore);
        const team = get(teamStore);
        onlineTransfer.joinRoom({ room, name, team, forceFallback: get(webRtcForceFallbackStore) == "true" });
      }
    });
  }

  getClient(id: string) {
    return this.clients.find((c) => c.info.id === id);
  }

  joinRoom({ room, name, team, forceFallback }: { room: string; name: string; team: string; forceFallback?: boolean }) {
    this.forceFallback = !!forceFallback;

    const url = new URL(SIGNALING_SERVER_URL);

    url.searchParams.set("room", room);
    if (name) {
      url.searchParams.set("name", name);
    }
    if (team) {
      url.searchParams.set("team", team);
    }

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      console.log("[websocket] opened");
      this.state = "connected";
    };

    ws.onerror = (error) => {
      console.error("[websocket] error:", error);
      this.state = undefined;
    };

    ws.onclose = () => {
      console.log("[websocket] closed");
      this.ws = undefined;
      this.state = undefined;
    };

    ws.onmessage = ({ data }) => this.handleWsMessage(data);
  }

  leaveRoom() {
    console.log("[websocket] manually closed");

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = undefined;
      this.state = undefined;
    }

    for (const client of this.clients) {
      client.channel?.close();
      client.connection?.close();
    }

    this.clients = [];
    this.localId = undefined;
    this.dataFromClients.clear();
    this.requestsFromClients.clear();
    this.clientsScoutingStatus.clear();
  }

  async sendToAll(data: Exclude<RTCMessage, { type: "candidates" }>) {
    const string = JSON.stringify(data, (key, value) => {
      if (key == "created" || key == "modified") return serializeDate(value);
      return value;
    });
    const compressed = await compress(string);

    const wsMessage: WSOutboundMessage =
      data.type == "request"
        ? { type: "request", to: [], request: data.request }
        : data.type == "response"
          ? { ...data, to: [] }
          : { type: "scouting", to: [], status: data.status };

    for (const client of this.clients) {
      if (
        client?.channel?.readyState == "open" &&
        client.connection?.connectionState == "connected" &&
        (!client.connection?.sctp?.maxMessageSize || compressed.byteLength < client.connection.sctp.maxMessageSize)
      ) {
        const webrtcLogLabel = `[webrtc-${client.info.id.slice(0, 8)}]`;
        console.log(webrtcLogLabel, "(channel) sending message", data);
        client.channel.send(compressed);
      } else {
        if (!wsMessage.to) wsMessage.to = [client.info.id];
        else wsMessage.to.push(client.info.id);
      }

      if (data.type !== "response") continue;
      this.satisfyRequestsFromClient(client.info.id, data);
    }

    if (wsMessage.to?.length) {
      this.sendWsMessage(wsMessage);
    }
  }

  async sendTo(remoteId: string, data: RTCMessage) {
    const webrtcLogLabel = `[webrtc-${remoteId.slice(0, 8)}]`;

    const string = JSON.stringify(data, (key, value) => {
      if (key == "created" || key == "modified") return serializeDate(value);
      return value;
    });
    const compressed = await compress(string);

    const client = this.getClient(remoteId);

    if (
      client?.channel?.readyState == "open" &&
      client.connection?.connectionState == "connected" &&
      (!client.connection?.sctp?.maxMessageSize || compressed.byteLength < client.connection.sctp.maxMessageSize)
    ) {
      console.log(webrtcLogLabel, "(channel) sending message", data);
      client.channel.send(compressed);
    } else {
      switch (data.type) {
        case "request":
          this.sendWsMessage({ ...data, to: [remoteId] });
          break;
        case "response":
          this.sendWsMessage({ ...data, to: [remoteId] });
          break;
        case "candidates":
          this.sendWsMessage({ ...data, candidates: { [remoteId]: data.candidates } });
          break;
        case "scouting":
          this.sendWsMessage(data);
          break;
      }
    }

    if (data.type !== "response") return;
    this.satisfyRequestsFromClient(remoteId, data);
  }

  onrtcrequestmessage: ((id: string, request: "entries" | "configs" | "all") => void) | undefined;
  onrtcresponsemessage: ((id: string, response: AllData) => void) | undefined;

  private satisfyRequestsFromClient(remoteId: string, message: Extract<RTCMessage, { type: "response" }>) {
    const sentEntries = !!message.data.entries?.length;
    const sentConfigs = !!message.data.comps?.length || !!message.data.surveys?.length || !!message.data.fields?.length;
    const sentAny = sentEntries || sentConfigs;

    const request = this.requestsFromClients.get(remoteId);

    if (
      (request == "entries" && sentEntries) ||
      (request == "configs" && sentConfigs) ||
      (request == "all" && sentAny)
    ) {
      this.requestsFromClients.delete(remoteId);
    }
  }

  sendWsMessage(message: WSOutboundMessage) {
    if (!this.ws) {
      console.error("[websocket] could not send message, no websocket");
      return;
    }

    if (message.type == "candidates") {
      for (const id in message.candidates) {
        this.candidateBatch.candidates[id] = [...(this.candidateBatch.candidates[id] || []), ...message.candidates[id]];
      }

      if (!this.candidateBatch.timer) {
        this.candidateBatch.timer = window.setTimeout(() => {
          const batchMessage: WSOutboundMessage = { type: "candidates", candidates: this.candidateBatch.candidates };
          console.log("[websocket] sending batched ice candidates", batchMessage);
          this.ws?.send(JSON.stringify(batchMessage));
          this.candidateBatch.candidates = {};
          this.candidateBatch.timer = undefined;
        }, this.candidateBatch.timeout);
      }

      return;
    }

    console.log("[websocket] sending message", message);
    const string = JSON.stringify(message, (key, value) => {
      if (key == "created" || key == "modified") return serializeDate(value);
      return value;
    });
    this.ws.send(string);
  }

  private handleWsMessage(data: any) {
    if (typeof data !== "string") {
      console.error("[websocket] received invalid message: not a string", data);
      return;
    }

    let message: WSInboundMessage;

    try {
      data = JSON.parse(data);
      message = z.parse(wsInboundMessageSchema, data);
    } catch (error) {
      console.error("[websocket] recieved invalid message: could not be parsed", error);
      return;
    }

    if (message.type == "error") {
      console.error("[websocket] received error message:", message.error);
      return;
    }

    if (message.type == "init") {
      console.log("[websocket] successfully joined room:", message);

      for (const client of this.clients) {
        client.channel?.close();
        client.connection?.close();
      }

      this.clients = [];
      this.requestsFromClients.clear();
      this.dataFromClients.clear();
      this.clientsScoutingStatus.clear();
      this.localId = message.id;

      for (const client of message.clients) {
        if (client.id === message.id) continue;
        this.addClient(client, { connectNow: true });
      }

      return;
    }

    if (!this.localId) {
      console.error("[websocket] couldn't receive message, still waiting for 'join' message");
      return;
    }

    let client: Client | undefined;

    switch (message.type) {
      case "clients":
        console.log("[websocket] received clients", message.clients);
        this.clients = this.clients.filter((existingClient) => {
          if (message.clients.some((c) => c.id === existingClient.info.id)) {
            return true;
          }
          existingClient.channel?.close();
          existingClient.connection?.close();
          this.requestsFromClients.delete(existingClient.info.id);
          this.dataFromClients.delete(existingClient.info.id);
          this.clientsScoutingStatus.delete(existingClient.info.id);
          return false;
        });
        for (const newClient of message.clients) {
          if (newClient.id === this.localId) continue;
          this.addClient(newClient, { connectNow: true });
        }
        break;
      case "info":
        console.log("[websocket] received client info", message.info);
        this.addClient(message.info);
        break;
      case "offer":
        if (this.forceFallback) {
          console.log("[websocket] received remote offer, but ignoring");
          break;
        }
        console.log("[websocket] received remote offer, sending answer", message);
        this.connectToClient(message.from, message.offer);
        break;
      case "answer":
        if (this.forceFallback) {
          console.log("[websocket] received remote answer, but ignoring");
          break;
        }
        console.log("[websocket] received remote answer", message);
        const answerConn = this.getClient(message.from)?.connection;
        if (!answerConn) {
          console.error("[websocket] couldn't receive answer, no connection", message);
          break;
        }
        answerConn.setRemoteDescription(message.answer);
        break;
      case "candidates":
        if (this.forceFallback) {
          console.log("[websocket] received candidate, but ignoring");
          break;
        }
        console.log("[websocket] received remote candidates", message.candidates);
        const connection = this.getClient(message.from)?.connection;
        if (!connection) {
          console.error("[websocket] couldn't handle batched candidates, no connection", message);
          break;
        }
        for (const candidate of message.candidates) {
          connection.addIceCandidate(candidate);
        }
        break;
      case "leave":
        client = this.getClient(message.id);
        client?.channel?.close();
        client?.connection?.close();
        this.requestsFromClients.delete(message.id);
        this.dataFromClients.delete(message.id);
        this.clientsScoutingStatus.delete(message.id);
        this.removeClient(message.id);
        break;
      case "request":
        console.log("[websocket] received fallback request", message);
        let request = this.requestsFromClients.get(message.from);
        if (!request) {
          this.requestsFromClients.set(message.from, "all");
          request = message.request;
        } else if (request != "all" && message.request != request) {
          this.requestsFromClients.set(message.from, "all");
          request = "all";
        }
        this.onrtcrequestmessage?.(message.from, request);
        break;
      case "response":
        console.log("[websocket] received fallback response", message);
        let data = this.dataFromClients.get(message.from);
        if (!data) {
          data = {
            comps: message.data.comps || [],
            surveys: message.data.surveys || [],
            fields: message.data.fields || [],
            entries: message.data.entries || [],
          };
          this.dataFromClients.set(message.from, data);
        } else {
          const { merged } = mergeOldAndNewData({
            existing: data,
            imported: message.data,
            overwriteDuplicateEntries: true,
            includeExisting: true,
          });
          data = merged;
          this.dataFromClients.set(message.from, data);
        }
        this.onrtcresponsemessage?.(message.from, data);
        break;
      case "scouting":
        client = this.getClient(message.from);
        if (!client) {
          console.error("[websocket] couldn't receive scouting status, client does not exist:", message);
          return;
        }
        console.log("[websocket] received fallback scouting status", message);
        if (message.status === "done") {
          this.clientsScoutingStatus.delete(message.from);
          return;
        }
        let status = $state(this.clientsScoutingStatus.get(message.from));
        if (!status) {
          status = { team: message.status.team };
        } else {
          status.team = message.status.team;
        }
        if (message.status.match) {
          status.match = message.status.match;
          status.prediction = message.status.prediction;
        } else {
          status.match = undefined;
          status.prediction = undefined;
        }
        this.clientsScoutingStatus.set(message.from, status);
        break;
    }
  }

  private addClient(info: ClientInfo, options?: { connectNow?: boolean | undefined }) {
    if (!this.localId) return;
    const existingClient = this.getClient(info.id);
    if (existingClient) {
      existingClient.info.name = info.name;
      existingClient.info.team = info.team;
    } else {
      const client = $state<Client>({ info, state: undefined });
      this.clients.push(client);
      if (options?.connectNow) {
        this.connectToClient(info.id);
      }
    }
  }

  private removeClient(id: string) {
    this.clients = this.clients.filter((c) => c.info.id !== id);
  }

  private connectToClient(remoteId: string, remoteOffer?: any) {
    const webrtcLogLabel = `[webrtc-${remoteId.slice(0, 8)}]`;

    if (this.forceFallback) {
      console.log(webrtcLogLabel, "forcing fallback, not creating a connection");
      return;
    }

    if (!this.localId) {
      console.error(webrtcLogLabel, "couldn't initialize connection, no signaling server");
      return;
    }

    if (this.localId == remoteId) {
      console.error(webrtcLogLabel, "couldn't initialize connection with self:", remoteId);
      return;
    }

    const client = this.getClient(remoteId);
    if (!client) {
      console.error(webrtcLogLabel, "couldn't initialize connection, client does not exist:", remoteId);
      return;
    }

    if (client.connection) {
      console.log(webrtcLogLabel, "reconnecting");
      client.channel?.close();
      client.channel = undefined;
      client.connection.close();
      client.connection = undefined;
    }

    console.log(webrtcLogLabel, "initializing", { remoteId, remoteOffer });

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    connection.onconnectionstatechange = () => {
      console.log(webrtcLogLabel, "connection state:", connection.connectionState);
      if (connection.connectionState == "connected" && client.channel?.readyState == "open") {
        client.state = "connected";
      } else {
        client.state = undefined;
      }
    };

    connection.ondatachannel = ({ channel }) => {
      const client = this.getClient(remoteId);
      if (!client) {
        channel.close();
        connection.close();
        console.error(webrtcLogLabel, "couldn't form channel, client does not exist", remoteId);
        return;
      }

      channel.onmessage = ({ data }) => this.handleRtcMessage(remoteId, data);
      channel.onopen = () => {
        client.channel = channel;
        client.state = "connected";
        console.log(webrtcLogLabel, "(channel) opened with", remoteId);
        if (this.localScoutingStatus) {
          this.sendTo(remoteId, { type: "scouting", status: this.localScoutingStatus });
        }
      };
      channel.onerror = (e) => {
        console.error(webrtcLogLabel, "(channel) error", e);
      };
      channel.onclose = () => {
        client.channel = undefined;
        client.state = undefined;
        console.log(webrtcLogLabel, "(channel) closed");
      };
    };

    connection.onicecandidate = (event) => {
      this.sendTo(remoteId, { type: "candidates", candidates: [event.candidate] });
    };

    connection.onicecandidateerror = (error) => {
      console.error(webrtcLogLabel, "ice candidate error:", error);
    };

    connection.oniceconnectionstatechange = () => {
      console.log(webrtcLogLabel, "ice connection state:", connection.iceConnectionState);
    };

    connection.onicegatheringstatechange = () => {
      console.log(webrtcLogLabel, "ice gathering state:", connection.iceGatheringState);
    };

    connection.onnegotiationneeded = () => {
      console.log(webrtcLogLabel, "negotiation needed, creating offer");
      connection
        .createOffer()
        .then((offer) => connection.setLocalDescription(offer))
        .then(() => this.sendWsMessage({ type: "offer", to: remoteId, offer: connection.localDescription }));
    };

    connection.onsignalingstatechange = () => {
      console.log(webrtcLogLabel, "signaling state:", connection.signalingState);
    };

    connection.ontrack = (track) => {
      console.log(webrtcLogLabel, "on track:", track);
    };

    if (remoteOffer) {
      connection
        .setRemoteDescription(remoteOffer)
        .then(() => connection.createAnswer())
        .then((answer) => connection.setLocalDescription(answer))
        .then(() => this.sendWsMessage({ type: "answer", to: remoteId, answer: connection.localDescription }));
    } else {
      const channel = connection.createDataChannel("data");
      channel.onmessage = ({ data }) => this.handleRtcMessage(remoteId, data);
      channel.onopen = () => {
        const client = this.getClient(remoteId);
        if (!client) {
          channel.close();
          connection.close();
          console.error(webrtcLogLabel, "couldn't form channel, client does not exist", remoteId);
          return;
        }

        client.channel = channel;
        client.state = "connected";
        console.log(webrtcLogLabel, "(channel) created with", remoteId);
        if (this.localScoutingStatus) {
          this.sendTo(remoteId, { type: "scouting", status: this.localScoutingStatus });
        }
      };
      channel.onerror = (e) => {
        console.error(webrtcLogLabel, "(channel) error", e);
      };
      channel.onclose = () => {
        client.channel = undefined;
        client.state = undefined;
        console.log(webrtcLogLabel, "(channel) closed");
      };
    }

    client.connection = connection;
  }

  private async handleRtcMessage(remoteId: string, data: any) {
    const logLabel = `[webrtc-${remoteId.slice(0, 8)}] (channel)`;

    const decompressed = await decompress(data);

    try {
      const json = JSON.parse(decompressed);
      const parsed = z.parse(rtcMessageSchema, json);

      if (parsed.type == "request") {
        console.log(logLabel, "received request", parsed);
        let request = this.requestsFromClients.get(remoteId);

        if (!request) {
          this.requestsFromClients.set(remoteId, parsed.request);
          request = parsed.request;
        } else if (request != "all" && parsed.request != request) {
          this.requestsFromClients.set(remoteId, "all");
          request = "all";
        }

        this.onrtcrequestmessage?.(remoteId, request);
      } else if (parsed.type == "response") {
        console.log(logLabel, "received response", parsed);
        let clientData = this.dataFromClients.get(remoteId);

        if (!clientData) {
          clientData = {
            comps: parsed.data.comps || [],
            surveys: parsed.data.surveys || [],
            fields: parsed.data.fields || [],
            entries: parsed.data.entries || [],
          };

          this.dataFromClients.set(remoteId, clientData);
        } else {
          const { merged } = mergeOldAndNewData({
            existing: clientData,
            imported: parsed.data,
            overwriteDuplicateEntries: true,
            includeExisting: true,
          });

          clientData = merged;
          this.dataFromClients.set(remoteId, clientData);
        }

        this.onrtcresponsemessage?.(remoteId, clientData);
      } else if (parsed.type == "candidates") {
        const client = this.getClient(remoteId);

        if (!client || !client.channel || !client.connection) {
          console.error(logLabel, "couldn't receive ice candidate, client does not exist:", parsed);
          return;
        }

        console.log(logLabel, "received ice candidate:", parsed);
        for (const candidate of parsed.candidates) {
          client.connection.addIceCandidate(candidate);
        }
      } else if (parsed.type == "scouting") {
        const client = this.getClient(remoteId);

        if (!client) {
          console.error(logLabel, "couldn't receive scouting status, client does not exist:", parsed);
          return;
        }

        console.log(logLabel, "received scouting status:", parsed);

        if (parsed.status === "done") {
          this.clientsScoutingStatus.delete(remoteId);
          return;
        }

        let status = $state(this.clientsScoutingStatus.get(remoteId));
        if (!status) {
          status = { team: parsed.status.team };
        } else {
          status.team = parsed.status.team;
        }

        if (parsed.status.match) {
          status.match = parsed.status.match;
          status.prediction = parsed.status.prediction;
        } else {
          status.match = undefined;
          status.prediction = undefined;
        }

        this.clientsScoutingStatus.set(remoteId, status);
      }
    } catch (e) {
      console.warn(logLabel, "received unusual message:", { data, decompressed, e });
    }
  }
}

export const onlineTransfer = new OnlineTransfer();
