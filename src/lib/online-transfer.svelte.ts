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

const SIGNALING_SERVER_URL = dev ? "http://localhost:8787" : "https://meanscout-webrtc.aidunlin.workers.dev";
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
          console.log("offer", message.data.offer);
          this.connectToClient(message.from, message.data.offer);
          break;
        }

        let connection = this.connections.get(message.from);
        if (!connection) {
          console.error("no connection on non-offer signal");
          break;
        }

        if (message.data.answer) {
          console.log("answer", message.data.answer);
          connection.setRemoteDescription(message.data.answer).then(() => {
            console.log("remote answer set");
          });
        } else if (message.data.candidate) {
          console.log("candidate", message.data.candidate);
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

  private connectToClient(id: string, offer?: any) {
    if (!this.signaling) throw new Error("Signaling server not initialized");

    console.log("setting up rtc connection");

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (offer) {
      connection.setRemoteDescription(offer).then(() => {
        console.log("remote offer set");
        connection.createAnswer().then((answer) => {
          console.log("answer created");
          connection.setLocalDescription(answer).then(() => {
            console.log("local answer set");
            this.ws?.send(JSON.stringify({ type: "signal", to: id, data: { answer } }));
          });
        });
      });
    } else {
      connection.createOffer().then((offer) => {
        console.log("offer created");
        connection.setLocalDescription(offer).then(() => {
          console.log("local offer set");
          this.ws?.send(JSON.stringify({ type: "signal", to: id, data: { offer } }));
        });
      });
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
