import path from "node:path";
import { fileURLToPath } from "node:url";

export interface ServerConfig {
  releaseDirectory: string;
  serverBinary: string;
  basePath: string;
  homePath: string;
  gameHost: string;
  gamePort: number;
  gatewayHost: string;
  gatewayPort: number;
  masterBaseUrl: string;
  eventIngestionUrl: string;
  eventClientSecret: string;
  heartbeatIntervalMs: number;
  heartbeatTimeoutMs: number;
  publishHost: string;
  publishPort: number;
  secure: boolean;
  maxConnections: number;
  maxPacketBytes: number;
  idleTimeoutMs: number;
  startupTimeoutMs: number;
  shutdownTimeoutMs: number;
  rconPassword?: string;
  extraGameArguments: readonly string[];
}

export const DEVELOPMENT_EVENT_CLIENT_SECRET =
  "98e9b63a7b1bcd9103cdc951cda26976d06b6076df6ab13da1f20c25c7699167";

function integer(environment: NodeJS.ProcessEnv, name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = environment[name];
  const value = raw === undefined || raw === "" ? fallback : Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function boolean(environment: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = environment[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") {
    return fallback;
  }
  if (raw === "true" || raw === "1") {
    return true;
  }
  if (raw === "false" || raw === "0") {
    return false;
  }
  throw new Error(`${name} must be true, false, 1, or 0.`);
}

function httpUrl(environment: NodeJS.ProcessEnv, name: string, fallback: string): string {
  const raw = environment[name]?.trim() || fallback;
  const parsed = new URL(raw);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${name} must use the http or https protocol.`);
  }
  return parsed.href;
}

function eventClientSecret(environment: NodeJS.ProcessEnv, eventIngestionUrl: string): string {
  const configured = environment.Q3JS_EVENT_CLIENT_SECRET?.trim();
  const eventHostname = new URL(eventIngestionUrl).hostname;
  const localEndpoint = eventHostname === "localhost"
    || eventHostname === "127.0.0.1"
    || eventHostname === "[::1]";
  if (!configured && !localEndpoint) {
    throw new Error("Q3JS_EVENT_CLIENT_SECRET is required when Q3JS_EVENT_URL is not local.");
  }
  const value = configured || DEVELOPMENT_EVENT_CLIENT_SECRET;
  if (!/^[A-Za-z0-9._~-]{32,512}$/.test(value)) {
    throw new Error("Q3JS_EVENT_CLIENT_SECRET must contain 32 to 512 URL-safe characters.");
  }
  return value;
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
  extraGameArguments: readonly string[] = process.argv.slice(2),
): ServerConfig {
  const appDirectory = path.dirname(fileURLToPath(import.meta.url));
  const releaseDirectory = path.resolve(appDirectory, "..");
  const homePath = path.resolve(environment.Q3JS_HOME_PATH ?? path.join(releaseDirectory, "..", "state"));
  const gatewayPort = integer(environment, "Q3JS_GATEWAY_PORT", 27961, 1, 65535);
  const masterBaseUrl = httpUrl(environment, "Q3JS_MASTER_URL", "http://localhost:8080");
  const eventIngestionUrl = httpUrl(
    environment,
    "Q3JS_EVENT_URL",
    new URL("/api/events", masterBaseUrl).href,
  );

  const config: ServerConfig = {
    releaseDirectory,
    serverBinary: path.resolve(environment.Q3JS_SERVER_BINARY ?? path.join(releaseDirectory, "bin", "ioq3ded")),
    basePath: path.resolve(environment.Q3JS_BASEPATH ?? path.join(releaseDirectory, "..", "data")),
    homePath,
    gameHost: environment.Q3JS_GAME_HOST?.trim() || "127.0.0.1",
    gamePort: integer(environment, "Q3JS_GAME_PORT", 27960, 1, 65535),
    gatewayHost: environment.Q3JS_GATEWAY_HOST?.trim() || "0.0.0.0",
    gatewayPort,
    masterBaseUrl,
    eventIngestionUrl,
    eventClientSecret: eventClientSecret(environment, eventIngestionUrl),
    heartbeatIntervalMs: integer(environment, "Q3JS_HEARTBEAT_INTERVAL_MS", 5000, 1000, 3600000),
    heartbeatTimeoutMs: integer(environment, "Q3JS_HEARTBEAT_TIMEOUT_MS", 3000, 100, 60000),
    publishHost: environment.Q3JS_PUBLISH_HOST?.trim() || "localhost",
    publishPort: integer(environment, "Q3JS_PUBLISH_PORT", gatewayPort, 1, 65535),
    secure: boolean(environment, "Q3JS_SECURE", false),
    maxConnections: integer(environment, "Q3JS_MAX_CONNECTIONS", 128, 1, 4096),
    maxPacketBytes: integer(environment, "Q3JS_MAX_PACKET_BYTES", 65535, 1024, 1048576),
    idleTimeoutMs: integer(environment, "Q3JS_IDLE_TIMEOUT_MS", 120000, 1000, 3600000),
    startupTimeoutMs: integer(environment, "Q3JS_STARTUP_TIMEOUT_MS", 30000, 1000, 300000),
    shutdownTimeoutMs: integer(environment, "Q3JS_SHUTDOWN_TIMEOUT_MS", 10000, 1000, 60000),
    extraGameArguments,
  };

  const rconPassword = environment.Q3JS_RCON_PASSWORD?.trim();
  if (rconPassword) {
    config.rconPassword = rconPassword;
  }

  return config;
}

export function eventConfigContents(config: Pick<ServerConfig, "eventClientSecret" | "eventIngestionUrl">): string {
  return [
    `set sv_killpost_url "${config.eventIngestionUrl}"`,
    `set sv_killpost_client_secret "${config.eventClientSecret}"`,
    "",
  ].join("\n");
}
