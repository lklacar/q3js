import { normalizeIpAddress } from "./ip-address.js";

export interface BanListOptions {
  masterBaseUrl: string;
  clientSecret: string | undefined;
  intervalMs: number;
  timeoutMs: number;
}

interface BanResponse {
  ipAddress: string;
}

function banEntries(value: unknown): BanResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("Master returned an invalid ban list.");
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || typeof (entry as BanResponse).ipAddress !== "string") {
      throw new Error("Master returned an invalid ban entry.");
    }
    return entry as BanResponse;
  });
}

export class BanList {
  readonly #options: BanListOptions;
  #addresses = new Set<string>();
  readonly #updateListeners = new Set<() => void>();
  #timer: NodeJS.Timeout | undefined;
  #request: AbortController | undefined;
  #refreshing = false;
  #started = false;

  constructor(options: BanListOptions) {
    this.#options = options;
  }

  async start(): Promise<void> {
    if (this.#started) {
      throw new Error("Ban list has already been started.");
    }
    this.#started = true;
    if (!this.#options.clientSecret) {
      return;
    }

    await this.#refresh();
    if (!this.#started) {
      return;
    }
    this.#timer = setInterval(() => void this.#refresh(), this.#options.intervalMs);
    this.#timer.unref();
  }

  stop(): void {
    this.#started = false;
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
    this.#request?.abort();
    this.#request = undefined;
  }

  get addresses(): readonly string[] {
    return [...this.#addresses];
  }

  isBanned(address: string): boolean {
    try {
      return this.#addresses.has(normalizeIpAddress(address));
    } catch {
      return false;
    }
  }

  onUpdate(listener: () => void): () => void {
    this.#updateListeners.add(listener);
    return () => this.#updateListeners.delete(listener);
  }

  async #refresh(): Promise<void> {
    if (this.#refreshing || !this.#options.clientSecret) {
      return;
    }
    this.#refreshing = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#options.timeoutMs);
    this.#request = controller;

    try {
      const response = await fetch(new URL("/api/bans", this.#options.masterBaseUrl), {
        headers: { "X-Q3JS-Client-Secret": this.#options.clientSecret },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const next = new Set<string>();
      for (const ban of banEntries(await response.json())) {
        try {
          next.add(normalizeIpAddress(ban.ipAddress));
        } catch {
          console.warn(`Ignoring invalid banned IP address: ${ban.ipAddress}`);
        }
      }
      this.#addresses = next;
      for (const listener of this.#updateListeners) {
        try {
          listener();
        } catch (error) {
          console.warn("Ban list update callback failed:", error);
        }
      }
    } catch (error) {
      if (this.#started) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Ban list refresh failed: ${message}`);
      }
    } finally {
      clearTimeout(timeout);
      if (this.#request === controller) {
        this.#request = undefined;
      }
      this.#refreshing = false;
    }
  }
}
