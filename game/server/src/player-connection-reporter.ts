import type { PlayerConnection } from "./native-control.js";

export interface PlayerConnectionReporterOptions {
  masterBaseUrl: string;
  clientSecret: string | undefined;
  timeoutMs: number;
  serverHost: string;
  serverPort: number;
}

export class PlayerConnectionReporter {
  readonly #options: PlayerConnectionReporterOptions;
  readonly #requests = new Set<AbortController>();

  constructor(options: PlayerConnectionReporterOptions) {
    this.#options = options;
  }

  async report(connection: PlayerConnection): Promise<void> {
    if (!this.#options.clientSecret) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#options.timeoutMs);
    this.#requests.add(controller);

    try {
      const endpoint = new URL("/api/player-connections", this.#options.masterBaseUrl);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Q3JS-Client-Secret": this.#options.clientSecret,
        },
        body: JSON.stringify({
          ...connection,
          serverHost: this.#options.serverHost,
          serverPort: this.#options.serverPort,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        console.warn(`Player connection report failed: HTTP ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Player connection report failed: ${message}`);
    } finally {
      clearTimeout(timeout);
      this.#requests.delete(controller);
    }
  }

  stop(): void {
    for (const request of this.#requests) {
      request.abort();
    }
    this.#requests.clear();
  }
}
