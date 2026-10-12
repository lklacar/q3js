import { BanList } from "./ban-list.js";
import { loadConfig } from "./config.js";
import { GameServer } from "./game-server.js";
import { MasterHeartbeat } from "./master-heartbeat.js";
import { PlayerConnectionReporter } from "./player-connection-reporter.js";

async function main(): Promise<void> {
  const config = loadConfig();
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
  const playerConnectionReporter = new PlayerConnectionReporter({
    masterBaseUrl: config.masterBaseUrl,
    clientSecret: config.eventClientSecret,
    timeoutMs: config.heartbeatTimeoutMs,
    serverHost: config.publishHost,
    serverPort: config.publishPort,
  });
  const banList = new BanList({
    masterBaseUrl: config.masterBaseUrl,
    clientSecret: config.eventClientSecret,
    intervalMs: config.banRefreshIntervalMs,
    timeoutMs: config.heartbeatTimeoutMs,
  });
  let gameReady = false;
  let stopping = false;

  const gameServer = new GameServer(config, (connection) => playerConnectionReporter.report(connection));
  banList.onUpdate(() => gameServer.setNativePolicy(gameReady, banList.addresses));

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
    playerConnectionReporter.stop();
    banList.stop();
    gameServer.setNativePolicy(false, banList.addresses);
    await gameServer.stop().catch((error: unknown) => console.error("Game server shutdown failed:", error));
    process.exitCode = exitCode;
  };

  process.once("SIGINT", () => requestStop(0));
  process.once("SIGTERM", () => requestStop(0));

  try {
    await banList.start();
    gameServer.setNativePolicy(false, banList.addresses);
    await gameServer.start();
    void gameServer.waitForExit().then((exitCode) => requestStop(exitCode));
    await gameServer.waitUntilReady();
    gameReady = true;
    gameServer.setNativePolicy(true, banList.addresses);
    await gameServer.waitUntilWebSocketReady();
    await masterHeartbeat.start();
    console.log(`Q3JS server ready: ws://${config.gatewayHost}:${config.gatewayPort}/ws`);
    await stop(await stopRequested);
  } catch (error) {
    console.error("Q3JS server failed:", error);
    await stop(1);
  }
}

await main();
