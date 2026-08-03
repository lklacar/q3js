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
  maxConnections: number;
  maxPacketBytes: number;
  idleTimeoutMs: number;
  startupTimeoutMs: number;
  shutdownTimeoutMs: number;
  rconPassword?: string;
  extraGameArguments: readonly string[];
}

function integer(environment: NodeJS.ProcessEnv, name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = environment[name];
  const value = raw === undefined || raw === "" ? fallback : Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
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

  const config: ServerConfig = {
    releaseDirectory,
    serverBinary: path.resolve(environment.Q3JS_SERVER_BINARY ?? path.join(releaseDirectory, "bin", "ioq3ded")),
    basePath: path.resolve(environment.Q3JS_BASEPATH ?? path.join(releaseDirectory, "..", "data")),
    homePath,
    gameHost: environment.Q3JS_GAME_HOST?.trim() || "127.0.0.1",
    gamePort: integer(environment, "Q3JS_GAME_PORT", 27960, 1, 65535),
    gatewayHost: environment.Q3JS_GATEWAY_HOST?.trim() || "0.0.0.0",
    gatewayPort: integer(environment, "Q3JS_GATEWAY_PORT", 27961, 1, 65535),
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
