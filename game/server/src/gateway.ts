import { createSocket } from "node:dgram";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocket, WebSocketServer } from "ws";

export interface GatewayOptions {
  host: string;
  port: number;
  targetHost: string;
  targetPort: number;
  maxConnections: number;
  maxPacketBytes: number;
  maxBufferedBytes?: number;
  idleTimeoutMs: number;
  ready: () => boolean;
}

const DISCONNECT_PACKET = Buffer.from("\xff\xff\xff\xffdisconnect\n", "latin1");

export class Gateway {
  readonly #options: GatewayOptions;
  readonly #httpServer: HttpServer;
  readonly #webSocketServer: WebSocketServer;
  readonly #clients = new Set<WebSocket>();

  constructor(options: GatewayOptions) {
    this.#options = options;
    this.#webSocketServer = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
      maxPayload: options.maxPacketBytes,
    });
    this.#httpServer = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/healthz") {
        const ready = this.#options.ready();
        response.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
        response.end(JSON.stringify({
          status: ready ? "ready" : "starting",
          gateway: "up",
          gameServer: ready ? "up" : "starting",
        }));
        return;
      }

      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Not found" }));
    });

    this.#httpServer.on("upgrade", (request, socket, head) => {
      if (!this.#options.ready() || this.#clients.size >= this.#options.maxConnections) {
        socket.end("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
        return;
      }
      if (request.url !== "/" && request.url !== "/ws") {
        socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        return;
      }
      this.#webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        this.#webSocketServer.emit("connection", webSocket, request);
      });
    });
    this.#webSocketServer.on("connection", (webSocket) => this.#handleConnection(webSocket));
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.#httpServer.once("error", reject);
      this.#httpServer.listen(this.#options.port, this.#options.host, () => {
        this.#httpServer.off("error", reject);
        resolve();
      });
    });
  }

  address(): AddressInfo {
    const address = this.#httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Gateway is not listening on a TCP address.");
    }
    return address;
  }

  async stop(): Promise<void> {
    const httpClosed = this.#httpServer.listening
      ? new Promise<void>((resolve, reject) => {
          this.#httpServer.close((error) => error ? reject(error) : resolve());
        })
      : Promise.resolve();

    for (const client of this.#clients) {
      client.terminate();
    }

    const webSocketsClosed = new Promise<void>((resolve) => {
      this.#webSocketServer.close(() => resolve());
    });
    await Promise.all([httpClosed, webSocketsClosed]);
  }

  #handleConnection(webSocket: WebSocket): void {
    this.#clients.add(webSocket);
    const udp = createSocket("udp4");
    let closed = false;
    let sentToTarget = false;
    let idleTimer: NodeJS.Timeout;

    const refreshIdleTimer = (): void => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => webSocket.close(1000, "Idle timeout"), this.#options.idleTimeoutMs);
      idleTimer.unref();
    };

    const closeUdp = (): void => {
      try {
        udp.close();
      } catch {
        // Socket is already closed.
      }
    };

    const close = (notifyTarget: boolean): void => {
      if (closed) {
        return;
      }
      closed = true;
      clearTimeout(idleTimer);
      this.#clients.delete(webSocket);

      if (!notifyTarget || !sentToTarget) {
        closeUdp();
        return;
      }

      const timeout = setTimeout(closeUdp, 100);
      udp.send(DISCONNECT_PACKET, this.#options.targetPort, this.#options.targetHost, () => {
        clearTimeout(timeout);
        closeUdp();
      });
    };

    udp.on("message", (message) => {
      refreshIdleTimer();
      if (
        webSocket.readyState === WebSocket.OPEN
        && webSocket.bufferedAmount <= (this.#options.maxBufferedBytes ?? 1_000_000)
      ) {
        webSocket.send(message, { binary: true });
      }
    });
    udp.on("error", () => {
      webSocket.close(1011, "UDP transport failed");
      close(false);
    });

    webSocket.on("message", (data, isBinary) => {
      if (!isBinary) {
        return;
      }
      const message = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data);
      if (message.byteLength > this.#options.maxPacketBytes) {
        webSocket.close(1009, "Packet too large");
        return;
      }
      refreshIdleTimer();
      sentToTarget = true;
      udp.send(message, this.#options.targetPort, this.#options.targetHost, (error) => {
        if (error) {
          webSocket.close(1011, "UDP transport failed");
          close(false);
        }
      });
    });
    webSocket.on("close", () => close(true));
    webSocket.on("error", () => close(true));
    refreshIdleTimer();
  }
}
