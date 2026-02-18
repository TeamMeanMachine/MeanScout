import { dev } from "$app/environment";
import { SvelteMap } from "svelte/reactivity";
import { z } from "zod";
import { compSchema } from "./comp";
import { entrySchema } from "./entry";
import { fieldSchema } from "./field";
import { surveySchema } from "./survey";

const clientInfoSchema = z.object({ id: z.string(), name: z.string().optional(), team: z.string().optional() });
export type ClientInfo = z.infer<typeof clientInfoSchema>;

const wsInboundMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), id: z.string(), clients: z.array(clientInfoSchema) }),
  z.object({ type: z.literal("clients"), clients: z.array(clientInfoSchema) }),
  z.object({ type: z.literal("info"), info: clientInfoSchema }),
  z.object({ type: z.literal("signal"), from: z.string(), data: z.any() }),
  z.object({ type: z.literal("leave"), id: z.string() }),
  z.object({ type: z.literal("error"), error: z.string() }),
]);

type WSInboundMessage = z.infer<typeof wsInboundMessageSchema>;

type WSOutboundMessage = {
  type: "signal";
  to: string;
  data:
    | { offer: RTCSessionDescription | null }
    | { answer: RTCSessionDescription | null }
    | { candidate: RTCIceCandidate };
};

const rtcRequestMessageSchema = z.object({
  type: z.literal("request"),
  from: z.string().optional(),
  request: z.union([z.literal("entries"), z.literal("configs"), z.literal("all")]),
});

export type RTCRequestMessage = z.infer<typeof rtcRequestMessageSchema>;

const rtcResponseMessageSchema = z.object({
  type: z.literal("response"),
  from: z.string().optional(),

  comps: compSchema.array().optional(),
  surveys: surveySchema.array().optional(),
  fields: fieldSchema.array().optional(),
  entries: entrySchema.array().optional(),
  version: z.number().optional(),
});

export type RTCResponseMessage = z.infer<typeof rtcResponseMessageSchema>;

const rtcMessageSchema = z.discriminatedUnion("type", [rtcRequestMessageSchema, rtcResponseMessageSchema]);

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
  private ws: WebSocket | undefined = undefined;

  /** This client's id, only set when connected to the signaling server. Reactive. */
  localId = $state<string | undefined>(undefined);

  /** A map of clients, deeply reactive. */
  clients = $state(new SvelteMap<string, Client>());

  /** A reactive list of remote clients. */
  remoteClients = $derived(
    this.localId
      ? this.clients
          .values()
          .filter((c) => c.info.id !== this.localId && c.channel)
          .toArray()
      : [],
  );

  /** A reactive list of incoming RTC messages from clients. */
  rtcMessages = $state<RTCMessage[]>([]);

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
      console.log("websocket: opened");
    };

    ws.onerror = (error) => {
      console.error("websocket: error:", error);
    };

    ws.onclose = () => {
      console.log("websocket: closed");
      this.ws = undefined;
      this.localId = undefined;
      for (const [, client] of this.clients) {
        client.connection?.close();
      }
      this.clients.clear();
      this.rtcMessages = [];
    };

    ws.onmessage = ({ data }) => this.handleWsMessage(ws, data);
  }

  leaveRoom() {
    console.log("websocket: manually closed");
    this.ws?.close();
    this.ws = undefined;
    this.localId = undefined;
    for (const [, client] of this.clients) {
      client.connection?.close();
    }
    this.clients.clear();
    this.rtcMessages = [];
  }

  sendToAll(data: RTCMessage) {
    const string = JSON.stringify(data, (key, value) => {
      if (key == "created" || key == "modified") return undefined;
      return value;
    });

    for (const [, client] of this.clients) {
      if (client.info.id == this.localId) continue;
      client.channel?.send(string);
    }

    if (data.type == "response") {
      const sentEntries = !!data.entries?.length;
      const sentConfigs = !!data.comps?.length || !!data.surveys?.length || !!data.fields?.length;
      const sentAny = sentEntries || sentConfigs;

      this.rtcMessages = this.rtcMessages.filter((m) => {
        return !(
          m.type == "request" &&
          ((m.request == "entries" && sentEntries) ||
            (m.request == "configs" && sentConfigs) ||
            (m.request == "all" && sentAny))
        );
      });
    }
  }

  sendTo(remoteId: string, data: RTCMessage) {
    const string = JSON.stringify(data, (key, value) => {
      if (key == "created" || key == "modified") return undefined;
      return value;
    });

    if (remoteId == this.localId) return;
    const channel = this.clients.get(remoteId)?.channel;
    channel?.send(string);

    if (channel && data.type == "response") {
      const sentEntries = !!data.entries?.length;
      const sentConfigs = !!data.comps?.length || !!data.surveys?.length || !!data.fields?.length;
      const sentAny = sentEntries || sentConfigs;

      this.rtcMessages = this.rtcMessages.filter((m) => {
        return !(
          m.from == remoteId &&
          m.type == "request" &&
          ((m.request == "entries" && sentEntries) ||
            (m.request == "configs" && sentConfigs) ||
            (m.request == "all" && sentAny))
        );
      });
    }
  }

  clearRtcMessage(message: RTCMessage) {
    this.rtcMessages = this.rtcMessages.filter((m) => {
      const requestMatches = m.type == "request" && message.type == "request" && m.request == message.request;
      const responseMatches =
        m.type == "response" &&
        message.type == "response" &&
        m.version === message.version &&
        m.comps?.length === message.comps?.length &&
        m.surveys?.length === message.surveys?.length &&
        m.fields?.length === message.fields?.length &&
        m.entries?.length === message.entries?.length;

      return !(m.from === message.from && (requestMatches || responseMatches));
    });
  }

  private rtcMessageAlreadyReceived(message: RTCMessage) {
    return this.rtcMessages.some((m) => {
      const requestMatches = m.type == "request" && message.type == "request" && m.request == message.request;
      const responseMatches =
        m.type == "response" &&
        message.type == "response" &&
        m.version === message.version &&
        m.comps?.length === message.comps?.length &&
        m.surveys?.length === message.surveys?.length &&
        m.fields?.length === message.fields?.length &&
        m.entries?.length === message.entries?.length;

      return m.from === message.from && (requestMatches || responseMatches);
    });
  }

  private sendWsMessage(message: WSOutboundMessage) {
    console.log("websocket: sending message", message);
    this.ws?.send(JSON.stringify(message));
  }

  private handleWsMessage(ws: WebSocket, data: any) {
    if (typeof data !== "string") {
      console.error("websocket: invalid message received: not a string");
      return;
    }

    let message: WSInboundMessage;

    try {
      data = JSON.parse(data);
      message = z.parse(wsInboundMessageSchema, data);
    } catch (error) {
      console.error("websocket: invalid message: could not be parsed", error);
      return;
    }

    if (message.type == "error") {
      console.error(`websocket: error message received: ${message.error}`);
      return;
    }

    console.log("websocket: message received:", message);

    if (message.type == "join") {
      this.localId = message.id;
      this.ws = ws;

      for (const client of message.clients) {
        this.addClient(client, { connectNow: client.id !== message.id });
      }

      return;
    }

    if (!this.localId) {
      console.error("websocket: error on message: waiting for 'join' message");
      return;
    }

    switch (message.type) {
      case "clients":
        for (const newClient of message.clients) {
          if (newClient.id == this.localId) continue;
          const existingClient = this.clients.get(newClient.id);
          if (existingClient) {
            existingClient.info.name = newClient.name;
            existingClient.info.team = newClient.team;
          } else {
            this.addClient(newClient, { connectNow: true });
          }
        }
        break;
      case "info":
        this.addClient(message.info);
        break;
      case "signal":
        if (message.data.offer) {
          console.log("websocket: remote offer received, connecting", message.data.offer);
          this.connectToClient(message.from, message.data.offer);
          break;
        }

        let connection = this.clients.get(message.from)?.connection;
        if (!connection) {
          console.error("websocket: no connection on non-offer signal");
          break;
        }

        if (message.data.answer) {
          connection.setRemoteDescription(message.data.answer).then(() => {
            console.log("websocket: remote answer received", message.data.answer);
          });
        } else if (message.data.candidate) {
          console.log("websocket: remote candidate received", message.data.candidate);
          connection.addIceCandidate(message.data.candidate);
        }
        break;
      case "leave":
        this.removeClient(message.id);
        break;
    }
  }

  private addClient(info: ClientInfo, options?: { connectNow?: boolean | undefined }) {
    if (!this.localId) return;
    const existingClient = this.clients.get(info.id);
    if (existingClient) {
      existingClient.info.name = info.name;
      existingClient.info.team = info.team;
    } else {
      const client = $state<Client>({ info });
      this.clients.set(info.id, client);
      if (options?.connectNow) {
        this.connectToClient(info.id);
      }
    }
  }

  private removeClient(id: string) {
    const client = this.clients.get(id);
    client?.connection?.close();
    this.clients.delete(id);
  }

  private connectToClient(remoteId: string, remoteOffer?: any) {
    if (!this.localId) throw new Error("Signaling server not initialized");
    if (this.localId == remoteId) throw new Error("Cannot form RTC connection with self");

    const client = this.clients.get(remoteId);
    if (!client) throw new Error(`Cannot form RTC connection, client does not exist, id ${remoteId}`);

    console.log("setting up rtc connection");

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    connection.onconnectionstatechange = () => {
      console.log("connection: on connection state change:", connection.connectionState);
    };

    connection.ondatachannel = ({ channel }) => {
      console.log("connection: on data channel:", channel);
      const client = this.clients.get(remoteId);
      if (!client) {
        connection.close();
        throw new Error(`Cannot form RTC channel, client does not exist, id ${remoteId}`);
      }

      channel.onopen = () => {
        client.channel = channel;
        console.log("data channel: opened");
      };
      channel.onmessage = ({ data }) => this.handleRtcMessage(remoteId, data);
    };

    connection.onicecandidate = (event) => {
      console.log("connection: on ice candidate:", event.candidate);
      if (event.candidate) {
        this.sendWsMessage({ type: "signal", to: remoteId, data: { candidate: event.candidate } });
      }
    };

    connection.onicecandidateerror = (error) => {
      console.log("connection: on ice candidate error:", error);
    };

    connection.oniceconnectionstatechange = () => {
      console.log("connection: on ice connection state change:", connection.iceConnectionState);
    };

    connection.onicegatheringstatechange = () => {
      console.log("connection: on ice gathering state change:", connection.iceGatheringState);
    };

    connection.onnegotiationneeded = () => {
      console.log("connection: on negotiation needed");
      connection
        .createOffer()
        .then((offer) => connection.setLocalDescription(offer))
        .then(() => {
          console.log("connection: offer created");
          this.sendWsMessage({ type: "signal", to: remoteId, data: { offer: connection.localDescription } });
        });
    };

    connection.onsignalingstatechange = () => {
      console.log("connection: on signaling state change:", connection.signalingState);
    };

    connection.ontrack = (track) => {
      console.log("connection: on track:", track);
    };

    if (remoteOffer) {
      connection
        .setRemoteDescription(remoteOffer)
        .then(() => connection.createAnswer())
        .then((answer) => connection.setLocalDescription(answer))
        .then(() => {
          console.log("connection: remote offer received, sending answer");
          this.sendWsMessage({ type: "signal", to: remoteId, data: { answer: connection.localDescription } });
        });
    } else {
      const dataChannel = connection.createDataChannel("data");
      dataChannel.onopen = () => {
        const client = this.clients.get(remoteId);
        if (!client) {
          connection.close();
          throw new Error(`connection: cannot form RTC channel, client does not exist, id ${remoteId}`);
        }
        client.channel = dataChannel;
        console.log("data channel: opened");
      };
      dataChannel.onmessage = ({ data }) => this.handleRtcMessage(remoteId, data);
    }

    client.connection = connection;
    console.log("setup done");
    return connection;
  }

  private handleRtcMessage(remoteId: string, data: any) {
    try {
      const json = JSON.parse(data);
      const parsed = z.parse(rtcMessageSchema, json);
      parsed.from = remoteId;

      if (this.rtcMessageAlreadyReceived(parsed)) {
        console.log("data channel: message already exists:", parsed);
        return;
      }

      this.rtcMessages.push(parsed);
      console.log("data channel: message received:", parsed);
    } catch (e) {
      console.log("data channel: unusual rtc message received:", e, data);
    }
  }
}

export const onlineTransfer = new OnlineTransfer();
