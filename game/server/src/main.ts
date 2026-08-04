import { createHash, X509Certificate } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadConfig } from "./config.js";
import { GameServer } from "./game-server.js";
import { HealthServer } from "./health-server.js";
import { MasterHeartbeat } from "./master-heartbeat.js";

async function webTransportCertificateHash(): Promise<string | undefined> {
  const certificateFile = process.env.Q3JS_TLS_CERT_FILE;
  if (!certificateFile) {
    return undefined;
  }
  const certificate = new X509Certificate(await readFile(certificateFile));
  return createHash("sha256").update(certificate.raw).digest("hex");
}

async function main(): Promise<void> {
  const config = loadConfig();
  const gameServer = new GameServer(config);
  const masterHeartbeat = new MasterHeartbeat({
    masterBaseUrl: config.masterBaseUrl,
    eventClientSecret: config.eventClientSecret,
    intervalMs: config.heartbeatIntervalMs,
    timeoutMs: config.heartbeatTimeoutMs,
    targetHost: config.publishHost,
    proxyPort: config.publishPort,
    targetPort: config.gamePort,
    secure: config.secure,
  });
  let gameReady = false;
  let stopping = false;

  const certificateHash = await webTransportCertificateHash();
  const healthServer = new HealthServer({
    host: config.gatewayHost,
    port: config.gatewayPort,
    ready: () => gameReady,
    ...(certificateHash ? { certificateHash } : {}),
  });

  let requestStop!: (exitCode: number) => void;
  const stopRequested = new Promise<number>((resolve) => {
    requestStop = resolve;
  });

  const stop = async (exitCode: number): Promise<void> => {
    if (stopping) {
      return;
    }
    stopping = true;
    gameReady = false;
    masterHeartbeat.stop();
    await healthServer.stop().catch((error: unknown) => console.error("Health server shutdown failed:", error));
    await gameServer.stop().catch((error: unknown) => console.error("Game server shutdown failed:", error));
    process.exitCode = exitCode;
  };

  process.once("SIGINT", () => requestStop(0));
  process.once("SIGTERM", () => requestStop(0));

  try {
    await healthServer.start();
    await gameServer.start();
    void gameServer.waitForExit().then((exitCode) => requestStop(exitCode));
    await gameServer.waitUntilReady();
    gameReady = true;
    await masterHeartbeat.start();
    console.log(`Q3JS server ready: https://${config.publishHost}:${config.publishPort}/wt`);
    await stop(await stopRequested);
  } catch (error) {
    console.error("Q3JS server failed:", error);
    await stop(1);
  }
}

await main();
