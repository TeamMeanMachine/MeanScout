import { dev } from "$app/environment";
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

// Should maybe set up a developers settings page to control things like this.
// Or maybe a way to use the web app's deployed location hostname.
const LOCALHOST_SIGNALING_URL = new URL("http://" + location.hostname + ":8787");
const DEPLOYED_SIGNALING_URL = new URL("https://meanscout-webrtc.aidunlin.workers.dev");

const SIGNALING_SERVER_URL = dev ? LOCALHOST_SIGNALING_URL : DEPLOYED_SIGNALING_URL;
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

class OnlineTransfer {
  ws: WebSocket | undefined = undefined;
  signaling = $state<{ clients: ClientInfo[]; localId: string } | undefined>();
  connections = $state(new Map<string, RTCPeerConnection>());

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
      ws.close();
      this.ws = undefined;
      this.signaling = undefined;
      this.clearConnections();
    };

    ws.onmessage = ({ data }) => this.handleMessage(ws, data);
  }

  leaveRoom() {
    console.log("WebSocket closed manually");
    this.ws?.close();
    this.ws = undefined;
    this.signaling = undefined;
    this.clearConnections();
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
      this.signaling = { clients: [], localId: message.id };
      this.ws = ws;

      for (const client of message.clients) {
        this.addClient(client);
        if (client.id == message.id) continue;
        this.connectToClient(client.id);
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
              this.connectToClient(newClient.id);
            }
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

        let connection = this.connections.get(message.from);
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
        this.disconnectFromClient(message.id);
        this.removeClient(message.id);
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

  private connectToClient(id: string, remoteOffer?: any) {
    if (!this.signaling) throw new Error("Signaling server not initialized");

    console.log("setting up rtc connection");

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    connection.onconnectionstatechange = () => {
      console.log("connection: on connection state change:", connection.connectionState);
    };

    connection.ondatachannel = ({ channel }) => {
      console.log("connection: on data channel:", channel);
      channel.onopen = () => {
        console.log("data channel: on open");
        channel.send(`hello from peer ${this.signaling?.localId}`);
      };
      channel.onmessage = ({ data }) => {
        console.log("data channel: on message:", data);
      };
      channel.send(`hello from peer ${this.signaling?.localId}`);
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
        console.log("data channel: opened");
        dataChannel.send(`hello from peer ${this.signaling?.localId}`);
      };
      dataChannel.onmessage = (event) => {
        console.log("data channel: on message:", event.data);
      };
    }

    this.connections.set(id, connection);
    console.log("setup done");
    return connection;
  }

  private disconnectFromClient(id: string) {
    this.connections.get(id)?.close();
    this.connections.delete(id);
  }

  private clearConnections() {
    for (const [, connection] of this.connections) {
      connection.close();
    }
    this.connections.clear();
  }
}

export const onlineTransfer = new OnlineTransfer();
