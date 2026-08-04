import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

export interface HealthServerOptions {
  host: string;
  port: number;
  ready: () => boolean;
  certificateHash?: string;
}

export class HealthServer {
  readonly #options: HealthServerOptions;
  readonly #server: HttpServer;

  constructor(options: HealthServerOptions) {
    this.#options = options;
    this.#server = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/webtransport.json") {
        response.writeHead(200, {
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
          "content-type": "application/json",
        });
        response.end(JSON.stringify({ certificateHash: this.#options.certificateHash ?? null }));
        return;
      }
      if (request.method === "GET" && request.url === "/healthz") {
        const ready = this.#options.ready();
        response.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
        response.end(JSON.stringify({
          status: ready ? "ready" : "starting",
          webTransport: ready ? "up" : "starting",
          gameServer: ready ? "up" : "starting",
        }));
        return;
      }
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Not found" }));
    });
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.#server.once("error", reject);
      this.#server.listen(this.#options.port, this.#options.host, () => {
        this.#server.off("error", reject);
        resolve();
      });
    });
  }

  address(): AddressInfo {
    const address = this.#server.address();
    if (!address || typeof address === "string") {
      throw new Error("Health server is not listening on a TCP address.");
    }
    return address;
  }

  async stop(): Promise<void> {
    if (!this.#server.listening) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.#server.close((error) => error ? reject(error) : resolve());
    });
  }
}
