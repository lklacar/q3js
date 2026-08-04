export interface MasterHeartbeatOptions {
  masterBaseUrl: string;
  eventClientSecret: string;
  intervalMs: number;
  timeoutMs: number;
  targetHost: string;
  proxyPort: number;
  targetPort: number;
  secure: boolean;
  transport: "websocket" | "webtransport";
}

export class MasterHeartbeat {
  readonly #options: MasterHeartbeatOptions;
  #timer: NodeJS.Timeout | undefined;
  #request: AbortController | undefined;
  #sending = false;

  constructor(options: MasterHeartbeatOptions) {
    this.#options = options;
  }

  async start(): Promise<void> {
    if (this.#timer) {
      throw new Error("Master heartbeat has already been started.");
    }

    await this.#send();
    this.#timer = setInterval(() => void this.#send(), this.#options.intervalMs);
    this.#timer.unref();
  }

  stop(): void {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
    this.#request?.abort();
    this.#request = undefined;
  }

  async #send(): Promise<void> {
    if (this.#sending) {
      return;
    }

    this.#sending = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#options.timeoutMs);
    this.#request = controller;

    try {
      const endpoint = new URL("/api/servers/heartbeat", this.#options.masterBaseUrl);
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "X-Q3JS-Client-Secret": this.#options.eventClientSecret,
        },
        body: JSON.stringify({
          targetHost: this.#options.targetHost,
          proxyPort: this.#options.proxyPort,
          targetPort: this.#options.targetPort,
          secure: this.#options.secure,
          transport: this.#options.transport,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        console.warn(`Master heartbeat failed: HTTP ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Master heartbeat failed: ${message}`);
    } finally {
      clearTimeout(timeout);
      if (this.#request === controller) {
        this.#request = undefined;
      }
      this.#sending = false;
    }
  }
}
