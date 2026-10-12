import { isIP } from "node:net";
import type { Duplex } from "node:stream";
import { normalizeIpAddress } from "./ip-address.js";

export interface PlayerConnection {
  clientIp: string;
  playerName: string;
  userinfo: Readonly<Record<string, string>>;
}

const MAX_CONTROL_BYTES = 1024 * 1024;
const MAX_REPORT_BYTES = 48 + 1024;
const PRIVATE_USERINFO_KEYS = new Set(["clientip", "ip", "password", "rconpassword"]);

export function readPlayerConnection(payload: Buffer): PlayerConnection {
  const separator = payload.indexOf(0);
  if (separator < 1 || separator >= 48 || payload.length > MAX_REPORT_BYTES) {
    throw new Error("Invalid native player connection record.");
  }
  const clientIp = normalizeIpAddress(payload.subarray(0, separator).toString("ascii"));
  if (isIP(clientIp) === 0) throw new Error("Invalid native player IP address.");
  const info = payload.subarray(separator + 1).toString("latin1");
  if (info.length >= 1024 || info.includes("\0")) throw new Error("Invalid native player userinfo.");
  const parts = info.split("\\");
  if (parts[0] !== "" || parts.length % 2 === 0) throw new Error("Invalid native userinfo pairs.");
  const userinfo = Object.create(null) as Record<string, string>;
  let playerName: string | undefined;
  for (let index = 1; index < parts.length; index += 2) {
    const key = parts[index]?.toLowerCase();
    const value = parts[index + 1];
    if (!key || value === undefined) throw new Error("Invalid native userinfo pair.");
    if (key === "name") playerName = value;
    if (!PRIVATE_USERINFO_KEYS.has(key)) userinfo[key] = value;
  }
  if (!playerName) throw new Error("Native player userinfo is missing the player name.");
  return { clientIp, playerName, userinfo };
}

export class NativeControl {
  readonly #stream: Duplex;
  readonly #playerConnected: (connection: PlayerConnection) => void | Promise<void>;
  #input = Buffer.alloc(0);
  #pendingPolicy: Buffer | undefined;
  #blocked = false;

  constructor(
    stream: Duplex,
    playerConnected: (connection: PlayerConnection) => void | Promise<void>,
    failed: (error: Error) => void,
  ) {
    this.#stream = stream;
    this.#playerConnected = playerConnected;
    stream.on("data", (chunk: Buffer) => {
      try {
        this.#receive(chunk);
      } catch (error) {
        failed(error instanceof Error ? error : new Error(String(error)));
      }
    });
    stream.on("error", failed);
    stream.on("drain", () => {
      this.#blocked = false;
      if (this.#pendingPolicy) {
        const policy = this.#pendingPolicy;
        this.#pendingPolicy = undefined;
        this.#write(policy);
      }
    });
  }

  setPolicy(ready: boolean, addresses: readonly string[]): void {
    const bans = addresses.map((address) => {
      const normalized = normalizeIpAddress(address);
      if (isIP(normalized) === 0) throw new Error("Invalid native ban address.");
      return `${normalized}\n`;
    }).join("");
    const length = 1 + Buffer.byteLength(bans, "ascii");
    if (length >= MAX_CONTROL_BYTES) throw new Error("Native ban policy exceeds its limit.");
    const message = Buffer.alloc(4 + length);
    message.writeUInt32BE(length);
    message[4] = ready ? 1 : 0;
    message.write(bans, 5, "ascii");
    // Keep only the newest snapshot while the engine's pipe is full.
    if (this.#blocked) this.#pendingPolicy = message;
    else this.#write(message);
  }

  #write(message: Buffer): void {
    this.#blocked = !this.#stream.write(message);
  }

  #receive(chunk: Buffer): void {
    this.#input = Buffer.concat([this.#input, chunk]);
    while (this.#input.length >= 4) {
      const length = this.#input.readUInt32BE();
      if (length < 1 || length > MAX_REPORT_BYTES) throw new Error("Invalid native report length.");
      if (this.#input.length < 4 + length) return;
      const connection = readPlayerConnection(this.#input.subarray(4, 4 + length));
      this.#input = this.#input.subarray(4 + length);
      void Promise.resolve(this.#playerConnected(connection)).catch((error: unknown) => {
        console.warn("Player connection callback failed:", error);
      });
    }
  }
}
