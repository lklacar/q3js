import { loadConfig } from "./config.js";
import { GameServer } from "./game-server.js";
import { Gateway } from "./gateway.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const gameServer = new GameServer(config);
  let gameReady = false;
  let stopping = false;

  const gateway = new Gateway({
    host: config.gatewayHost,
    port: config.gatewayPort,
    targetHost: config.gameHost,
    targetPort: config.gamePort,
    maxConnections: config.maxConnections,
    maxPacketBytes: config.maxPacketBytes,
    idleTimeoutMs: config.idleTimeoutMs,
    ready: () => gameReady,
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
    await gateway.stop().catch((error: unknown) => console.error("Gateway shutdown failed:", error));
    await gameServer.stop().catch((error: unknown) => console.error("Game server shutdown failed:", error));
    process.exitCode = exitCode;
  };

  process.once("SIGINT", () => requestStop(0));
  process.once("SIGTERM", () => requestStop(0));

  try {
    await gateway.start();
    await gameServer.start();
    void gameServer.waitForExit().then((exitCode) => requestStop(exitCode));
    await gameServer.waitUntilReady();
    gameReady = true;
    console.log(`Q3JS server ready: ws://${config.gatewayHost}:${gateway.address().port}/ws`);
    await stop(await stopRequested);
  } catch (error) {
    console.error("Q3JS server failed:", error);
    await stop(1);
  }
}

await main();
