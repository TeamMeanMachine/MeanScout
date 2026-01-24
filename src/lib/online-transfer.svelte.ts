import { dev } from "$app/environment";
import { SvelteMap } from "svelte/reactivity";
import { z } from "zod";

const clientInfoSchema = z.object({ id: z.string(), name: z.string().optional(), team: z.string().optional() });
type ClientInfo = z.infer<typeof clientInfoSchema>;

const inboundMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), id: z.string(), clients: z.array(clientInfoSchema) }),
  z.object({ type: z.literal("clients"), clients: z.array(clientInfoSchema) }),
  z.object({ type: z.literal("info"), info: clientInfoSchema }),
  z.object({ type: z.literal("signal"), from: z.string(), data: z.any() }),
  z.object({ type: z.literal("leave"), id: z.string() }),
  z.object({ type: z.literal("error"), error: z.string() }),
]);

type InboundMessage = z.infer<typeof inboundMessageSchema>;

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
  /** This client's id, only set when connected to the signaling server. */
  localId = $state<string | undefined>(undefined);
  /** The list of clients, deeply reactive. */
  clients = $state(new SvelteMap<string, Client>());

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
      console.log("WebSocket was opened");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error", error);
    };

    ws.onclose = () => {
      console.log("WebSocket was closed");
      this.ws = undefined;
      this.localId = undefined;
      for (const [, client] of this.clients) {
        client.connection?.close();
      }
      this.clients.clear();
    };

    ws.onmessage = ({ data }) => this.handleMessage(ws, data);
  }

  leaveRoom() {
    console.log("WebSocket closed manually");
    this.ws?.close();
    this.ws = undefined;
    this.localId = undefined;
    for (const [, client] of this.clients) {
      client.connection?.close();
    }
    this.clients.clear();
  }

  private handleMessage(ws: WebSocket, data: any) {
    if (typeof data !== "string") {
      console.error("Invalid message received: not a string");
      return;
    }

    let message: InboundMessage;

    try {
      data = JSON.parse(data);
      message = z.parse(inboundMessageSchema, data);
    } catch (error) {
      console.error("Invalid message: could not be parsed", error);
      return;
    }

    console.log(message);

    if (message.type == "error") {
      console.error(`Error received: ${message.error}`);
      return;
    }

    if (message.type == "join") {
      this.localId = message.id;
      this.ws = ws;

      for (const client of message.clients) {
        this.addClient(client, { connectNow: client.id !== message.id });
      }

      return;
    }

    if (!this.localId) {
      console.error("Waiting for 'join' message");
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
          console.log("offer received", message.data.offer);
          this.connectToClient(message.from, message.data.offer);
          break;
        }

        let connection = this.clients.get(message.from)?.connection;
        if (!connection) {
          console.error("no connection on non-offer signal");
          break;
        }

        if (message.data.answer) {
          console.log("answer received", message.data.answer);
          connection.setRemoteDescription(message.data.answer).then(() => {
            console.log("remote answer set");
          });
        } else if (message.data.candidate) {
          console.log("candidate received", message.data.candidate);
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

  private connectToClient(id: string, remoteOffer?: any) {
    if (!this.localId) throw new Error("Signaling server not initialized");
    if (this.localId == id) throw new Error("Cannot form RTC connection with self");

    const client = this.clients.get(id);
    if (!client) throw new Error(`Cannot form RTC connection, client does not exist, id ${id}`);

    console.log("setting up rtc connection");

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    connection.onconnectionstatechange = () => {
      console.log("connection: on connection state change:", connection.connectionState);
    };

    connection.ondatachannel = ({ channel }) => {
      console.log("connection: on data channel:", channel);
      const client = this.clients.get(id);
      if (!client) {
        connection.close();
        throw new Error(`Cannot form RTC channel, client does not exist, id ${id}`);
      }

      client.channel = channel;
      channel.onopen = () => {
        console.log("data channel: on open");
        channel.send(`hello from peer ${this.localId}`);
      };
      channel.onmessage = ({ data }) => {
        console.log("data channel: on message:", data);
      };
      channel.send(`hello from peer ${this.localId}`);
    };

    connection.onicecandidate = (event) => {
      console.log("connection: on ice candidate:", event.candidate);
      if (event.candidate) {
        this.ws?.send(JSON.stringify({ type: "signal", to: id, data: { candidate: event.candidate } }));
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
      console.log("connection: on negotiation needed:");
      connection
        .createOffer()
        .then((offer) => connection.setLocalDescription(offer))
        .then(() => {
          console.log("connection: offer created");
          this.ws?.send(JSON.stringify({ type: "signal", to: id, data: { offer: connection.localDescription } }));
        });
    };

    connection.onsignalingstatechange = () => {
      console.log("connection: on signaling state change:", connection.signalingState);
    };

    connection.ontrack = (track) => {
      console.log("connection: on track:", track);
    };

    if (remoteOffer) {
      connection.setRemoteDescription(remoteOffer).then(() => {
        console.log("connection: remote offer set");
        connection.createAnswer().then((answer) => {
          console.log("connection: answer created");
          connection.setLocalDescription(answer).then(() => {
            console.log("connection: local answer set");
            this.ws?.send(JSON.stringify({ type: "signal", to: id, data: { answer } }));
          });
        });
      });
    } else {
      const dataChannel = connection.createDataChannel("data");
      dataChannel.onopen = () => {
        const client = this.clients.get(id);
        if (!client) {
          connection.close();
          throw new Error(`Cannot form RTC channel, client does not exist, id ${id}`);
        }
        client.channel = dataChannel;
        console.log("data channel: opened");
        dataChannel.send(`hello from peer ${this.localId}`);
      };
      dataChannel.onmessage = (event) => {
        console.log("data channel: on message:", event.data);
      };
    }

    client.connection = connection;
    console.log("setup done");
    return connection;
  }
}

export const onlineTransfer = new OnlineTransfer();
