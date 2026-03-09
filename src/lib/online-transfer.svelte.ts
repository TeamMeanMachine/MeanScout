import { dev } from "$app/environment";
import { SvelteMap } from "svelte/reactivity";
import { z } from "zod";
import type { AllData } from "./idb";
import { importSchema, mergeOldAndNewData } from "./import.svelte";

const clientInfoSchema = z.object({ id: z.string(), name: z.string().optional(), team: z.string().optional() });
export type ClientInfo = z.infer<typeof clientInfoSchema>;

const inboundCandidateMessageSchema = z.object({ type: z.literal("candidate"), from: z.string(), candidate: z.any() });

const wsInboundMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("init"), id: z.string(), clients: z.array(clientInfoSchema) }),
  z.object({ type: z.literal("clients"), clients: z.array(clientInfoSchema) }),
  z.object({ type: z.literal("info"), info: clientInfoSchema }),
  z.object({ type: z.literal("offer"), from: z.string(), offer: z.any() }),
  z.object({ type: z.literal("answer"), from: z.string(), answer: z.any() }),
  inboundCandidateMessageSchema,
  z.object({ type: z.literal("leave"), id: z.string() }),
  z.object({ type: z.literal("error"), error: z.string() }),
  z.object({ type: z.literal("batch"), messages: z.array(inboundCandidateMessageSchema) }),
]);

type WSInboundMessage = z.infer<typeof wsInboundMessageSchema>;

type WSOutboundCandidateMessage = { type: "candidate"; to: string; candidate: RTCIceCandidate | null };

type WSOutboundMessage =
  | { type: "offer"; to: string; offer: RTCSessionDescription | null }
  | { type: "answer"; to: string; answer: RTCSessionDescription | null }
  | WSOutboundCandidateMessage
  | { type: "batch"; messages: WSOutboundCandidateMessage[] };

const rtcRequestMessageSchema = z.object({
  type: z.literal("request"),
  from: z.string().optional(),
  request: z.union([z.literal("entries"), z.literal("configs"), z.literal("all")]),
});

export type RTCRequestMessage = z.infer<typeof rtcRequestMessageSchema>;

const rtcResponseMessageSchema = z.object({
  type: z.literal("response"),
  from: z.string().optional(),
  ...importSchema.shape,
});

export type RTCResponseMessage = z.infer<typeof rtcResponseMessageSchema>;

const rtcSignalMessageSchema = z.object({
  type: z.literal("candidate"),
  from: z.string().optional(),
  candidate: z.any(),
});

export type RTCSignalMessage = z.infer<typeof rtcSignalMessageSchema>;

const rtcMessageSchema = z.discriminatedUnion("type", [
  rtcRequestMessageSchema,
  rtcResponseMessageSchema,
  rtcSignalMessageSchema,
]);

export type RTCMessage = z.infer<typeof rtcMessageSchema>;

/** Contains everything about a client: basic metadata such as id and name, and potentially an active connection/channel. */
type Client = {
  info: ClientInfo;
  /** May or may not exist or be ready for RTC data transfer. */
  connection?: RTCPeerConnection;
  /** Should only exist when the client is ready for RTC data transfer. */
  channel?: RTCDataChannel;
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

  /** Temporary list of batched outbound candidate messages. */
  private signalBatch: { messages: WSOutboundCandidateMessage[]; timer: number | undefined; timeout: number } = {
    messages: [],
    timer: undefined,
    timeout: 100,
  };

  /** This client's id, only set when connected to the signaling server. Reactive. */
  localId = $state<string | undefined>(undefined);

  /** Reactive list of remote clients. */
  clients = $state<Client[]>([]);

  /** Reactive map of any remote clients' requests. */
  requestsFromClients = $state(new SvelteMap<string, "entries" | "configs" | "all">());

  /** Reactive map of any remote clients' data. */
  dataFromClients = $state(new SvelteMap<string, AllData>());

  /** Reactive counts of different requests. */
  requestCounts = $derived.by(() => {
    const messages = Object.groupBy(onlineTransfer.requestsFromClients.values(), (r) => r);
    return {
      entries: messages.entries?.length || 0,
      configs: messages.configs?.length || 0,
      all: messages.all?.length || 0,
    };
  });

  getClient(id: string) {
    return this.clients.find((c) => c.info.id === id);
  }

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
    this.ws = ws;

    ws.onopen = () => {
      console.log("[websocket] opened");
    };

    ws.onerror = (error) => {
      console.error("[websocket] error:", error);
    };

    ws.onclose = () => {
      console.log("[websocket] closed");
      this.ws = undefined;

      for (const client of this.clients) {
        client.connection?.close();
      }

      this.clients = [];
      this.localId = undefined;
      this.dataFromClients.clear();
      this.requestsFromClients.clear();
    };

    ws.onmessage = ({ data }) => this.handleWsMessage(data);
  }

  leaveRoom() {
    console.log("[websocket] manually closed");

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = undefined;
    }

    for (const client of this.clients) {
      client.connection?.close();
    }

    this.clients = [];
    this.localId = undefined;
    this.dataFromClients.clear();
    this.requestsFromClients.clear();
  }

  sendToAll(data: RTCMessage) {
    const string = JSON.stringify(data, (key, value) => {
      if (key == "created" || key == "modified") return undefined;
      return value;
    });

    for (const client of this.clients) {
      if (!client.channel) continue;
      client.channel.send(string);
      if (data.type !== "response") continue;
      this.satisfyRequestsFromClient(client.info.id, data);
    }
  }

  sendTo(remoteId: string, data: RTCMessage) {
    const string = JSON.stringify(data, (key, value) => {
      if (key == "created" || key == "modified") return undefined;
      return value;
    });

    const client = this.getClient(remoteId);

    if (!client?.channel) return;
    client.channel.send(string);
    if (data.type !== "response") return;
    this.satisfyRequestsFromClient(remoteId, data);
  }

  private satisfyRequestsFromClient(remoteId: string, data: RTCResponseMessage) {
    const sentEntries = !!data.entries?.length;
    const sentConfigs = !!data.comps?.length || !!data.surveys?.length || !!data.fields?.length;
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

  private sendWsMessage(message: WSOutboundMessage) {
    if (message.type == "candidate") {
      console.log("[websocket] batching ice candidate", message.candidate);
      this.signalBatch.messages.push(message);

      if (!this.signalBatch.timer) {
        this.signalBatch.timer = window.setTimeout(() => {
          const batchMessage = { type: "batch", messages: this.signalBatch.messages };
          console.log("[websocket] sending batch message", batchMessage);
          this.ws?.send(JSON.stringify(batchMessage));
          this.signalBatch.messages = [];
          this.signalBatch.timer = undefined;
        }, this.signalBatch.timeout);
      }

      return;
    }

    console.log("[websocket] sending message", message);
    this.ws?.send(JSON.stringify(message));
  }

  private handleWsMessage(data: any) {
    if (typeof data !== "string") {
      console.error("[websocket] received invalid message: not a string");
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

    switch (message.type) {
      case "clients":
        console.log("[websocket] received clients", message.clients);
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
        console.log("[websocket] received remote offer, connecting", message.offer);
        this.connectToClient(message.from, message.offer);
        break;
      case "answer":
      case "candidate":
        const connection = this.getClient(message.from)?.connection;
        if (!connection) {
          console.error("[websocket] couldn't receive answer/candidate signal, no connection", message);
          break;
        }
        if (message.type == "answer") {
          console.log("[websocket] received remote answer", message.answer);
          connection.setRemoteDescription(message.answer);
        } else if (message.type == "candidate") {
          console.log("[websocket] received remote candidate", message.candidate);
          connection.addIceCandidate(message.candidate);
        }
        break;
      case "leave":
        const client = this.getClient(message.id);
        client?.connection?.close();
        this.removeClient(message.id);
        break;
      case "batch":
        console.log("[websocket] received remote candidates", message.messages);
        for (const msg of message.messages) {
          let connection = this.getClient(msg.from)?.connection;
          if (!connection) {
            console.warn("[websocket] couldn't handle message from batch, no connection:", msg);
            break;
          }
          if (!connection.remoteDescription) {
            console.warn("[websocket] couldn't handle message from batch, no remote description:", msg);
            break;
          }
          connection.addIceCandidate(msg.candidate);
        }
    }
  }

  private addClient(info: ClientInfo, options?: { connectNow?: boolean | undefined }) {
    if (!this.localId) return;
    const existingClient = this.getClient(info.id);
    if (existingClient) {
      existingClient.info.name = info.name;
      existingClient.info.team = info.team;
    } else {
      const client = $state<Client>({ info });
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
      client.connection.close();
      client.connection = undefined;
      client.channel = undefined;
    }

    console.log(webrtcLogLabel, "initializing", { remoteId, remoteOffer });

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    connection.onconnectionstatechange = () => {
      console.log(webrtcLogLabel, "connection state:", connection.connectionState);
    };

    connection.ondatachannel = ({ channel }) => {
      const client = this.getClient(remoteId);
      if (!client) {
        console.error(webrtcLogLabel, "couldn't form channel, client does not exist", remoteId);
        connection.close();
        return;
      }

      channel.onopen = () => {
        client.channel = channel;
        console.log(webrtcLogLabel, "(channel) opened with", remoteId);
      };
      channel.onmessage = ({ data }) => this.handleRtcMessage(remoteId, data);
    };

    connection.onicecandidate = (event) => {
      if (client.channel?.readyState == "open") {
        console.log(webrtcLogLabel, "(channel) sending ice candidate:", event.candidate);
        client.channel.send(
          JSON.stringify({ type: "candidate", candidate: event.candidate } satisfies RTCSignalMessage),
        );
      } else {
        this.sendWsMessage({ type: "candidate", to: remoteId, candidate: event.candidate });
      }
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
      console.log("[websocket] received remote offer, sending answer");
      connection
        .setRemoteDescription(remoteOffer)
        .then(() => connection.createAnswer())
        .then((answer) => connection.setLocalDescription(answer))
        .then(() => this.sendWsMessage({ type: "answer", to: remoteId, answer: connection.localDescription }));
    } else {
      const dataChannel = connection.createDataChannel("data");
      dataChannel.onopen = () => {
        const client = this.getClient(remoteId);
        if (!client) {
          connection.close();
          console.error(webrtcLogLabel, "couldn't form channel, client does not exist", remoteId);
          return;
        }

        client.channel = dataChannel;
        console.log(webrtcLogLabel, "(channel) created with", remoteId);
      };
      dataChannel.onmessage = ({ data }) => this.handleRtcMessage(remoteId, data);
    }

    client.connection = connection;
  }

  private handleRtcMessage(remoteId: string, data: any) {
    const logLabel = `[webrtc-${remoteId.slice(0, 8)}] (channel)`;

    try {
      const json = JSON.parse(data);
      const parsed = z.parse(rtcMessageSchema, json);
      parsed.from = remoteId;

      if (parsed.type == "request") {
        console.log(logLabel, "received request", parsed);
        const existingRequest = this.requestsFromClients.get(remoteId);
        if (!existingRequest) {
          this.requestsFromClients.set(remoteId, parsed.request);
        } else if (existingRequest != "all" && parsed.request != existingRequest) {
          this.requestsFromClients.set(remoteId, "all");
        }
      } else if (parsed.type == "response") {
        console.log(logLabel, "received response", parsed);
        const existingData = this.dataFromClients.get(remoteId);
        if (!existingData) {
          this.dataFromClients.set(remoteId, {
            comps: parsed.comps || [],
            surveys: parsed.surveys || [],
            fields: parsed.fields || [],
            entries: parsed.entries || [],
          });
        } else {
          const { merged } = mergeOldAndNewData({
            existing: existingData,
            imported: parsed,
            overwriteDuplicateEntries: true,
            includeExisting: true,
          });
          this.dataFromClients.set(remoteId, merged);
        }
      } else if (parsed.type == "candidate") {
        const client = this.getClient(remoteId);
        if (!client || !client.channel || !client.connection) {
          console.error(logLabel, "client does not exist, couldn't receive ice candidate:", parsed);
          return;
        }
        if (parsed.candidate) {
          console.log(logLabel, "received ice candidate:", parsed);
          client.connection.addIceCandidate(parsed.candidate);
          return;
        }
      }
    } catch (e) {
      console.warn(logLabel, "received unusual message:", data, e);
    }
  }
}

export const onlineTransfer = new OnlineTransfer();
