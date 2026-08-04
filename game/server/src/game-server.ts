import { createSocket } from "node:dgram";
import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { eventConfigContents, type ServerConfig } from "./config.js";

interface ReleaseManifest {
  gamePackage: {
    filename: string;
    sha256: string;
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function queryStatus(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createSocket("udp4");
    let settled = false;

    const finish = (ready: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      try {
        socket.close();
      } catch {
        // Socket never opened or has already closed.
      }
      resolve(ready);
    };

    const timeout = setTimeout(() => finish(false), timeoutMs);
    socket.once("error", () => finish(false));
    socket.once("message", (message) => {
      finish(message.subarray(4).toString("ascii").startsWith("statusResponse"));
    });
    socket.send(Buffer.from("\xff\xff\xff\xffgetstatus\n", "latin1"), port, host, (error) => {
      if (error) {
        finish(false);
      }
    });
  });
}

export class GameServer {
  readonly #config: ServerConfig;
  #process?: ChildProcess;
  #exitPromise?: Promise<number>;
  #eventConfigPath: string | undefined;
  #serverConfigPath: string | undefined;

  constructor(config: ServerConfig) {
    this.#config = config;
  }

  get running(): boolean {
    return this.#process !== undefined
      && this.#process.exitCode === null
      && this.#process.signalCode === null;
  }

  async start(): Promise<void> {
    if (this.#process) {
      throw new Error("Game server has already been started.");
    }

    await this.#installReleaseFiles();
    const arguments_ = this.#arguments();
    const child = spawn(process.execPath, [this.#config.serverBinary, ...arguments_], {
      stdio: "inherit",
      env: {
        ...process.env,
        Q3JS_WEBTRANSPORT_HOST: this.#config.gatewayHost,
        Q3JS_WEBTRANSPORT_PORT: String(this.#config.gatewayPort),
        Q3JS_MAX_CONNECTIONS: String(this.#config.maxConnections),
      },
    });
    this.#process = child;
    this.#exitPromise = new Promise((resolve) => {
      child.once("error", () => resolve(1));
      child.once("exit", (code, signal) => {
        if (signal) {
          resolve(128);
        } else {
          resolve(code ?? 1);
        }
      });
    });
    try {
      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
    } catch (error) {
      await this.#removeRuntimeConfigs();
      throw error;
    }
  }

  async waitUntilReady(): Promise<void> {
    const deadline = Date.now() + this.#config.startupTimeoutMs;
    while (Date.now() < deadline) {
      if (!this.running) {
        throw new Error("ioq3ded exited before becoming ready.");
      }
      if (await queryStatus(this.#config.gameHost, this.#config.gamePort, 500)) {
        return;
      }
      await delay(250);
    }
    throw new Error(`ioq3ded did not become ready within ${this.#config.startupTimeoutMs}ms.`);
  }

  waitForExit(): Promise<number> {
    if (!this.#exitPromise) {
      throw new Error("Game server has not been started.");
    }
    return this.#exitPromise;
  }

  async stop(): Promise<void> {
    const child = this.#process;
    if (!child || child.exitCode !== null || child.signalCode !== null) {
      await this.#removeRuntimeConfigs();
      return;
    }

    child.kill("SIGTERM");
    const exited = await Promise.race([
      this.waitForExit().then(() => true),
      delay(this.#config.shutdownTimeoutMs).then(() => false),
    ]);
    if (!exited && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await this.waitForExit();
    }
    await this.#removeRuntimeConfigs();
  }

  #arguments(): string[] {
    const serverConfigArguments = this.#config.serverConfig
      ? ["+exec", "q3js-server.cfg"]
      : ["+exec", "q3js-defaults.cfg", "+exec", "autoexec.cfg"];
    const arguments_ = [
      "+set", "dedicated", "2",
      "+set", "fs_basepath", this.#config.basePath,
      "+set", "fs_homepath", this.#config.homePath,
      "+set", "fs_game", "q3js",
      "+set", "net_ip", this.#config.gameHost,
      "+set", "net_port", String(this.#config.gamePort),
      "+set", "sv_pure", "1",
      "+set", "sv_allowDownload", "1",
      "+set", "sv_dlURL", "",
      "+sets", "gamename", "q3js",
      "+exec", "q3js-events.cfg",
      ...serverConfigArguments,
    ];

    if (this.#config.rconPassword) {
      arguments_.push("+set", "rconPassword", this.#config.rconPassword);
    }
    arguments_.push(...this.#config.extraGameArguments);
    return arguments_;
  }

  async #installReleaseFiles(): Promise<void> {
    const manifestPath = path.join(this.#config.releaseDirectory, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ReleaseManifest;
    const sourceGameDirectory = path.join(this.#config.releaseDirectory, "game", "q3js");
    const sourceGamePackage = path.join(sourceGameDirectory, manifest.gamePackage.filename);
    const targetGameDirectory = path.join(this.#config.homePath, "q3js");
    await mkdir(targetGameDirectory, { recursive: true });

    const packageHash = createHash("sha256").update(await readFile(sourceGamePackage)).digest("hex");
    if (packageHash !== manifest.gamePackage.sha256) {
      throw new Error(`Packaged game data failed its SHA-256 check: ${manifest.gamePackage.filename}`);
    }

    for (const entry of await readdir(targetGameDirectory)) {
      if (/^q3js-game-[a-f0-9]+\.pk3$/.test(entry) && entry !== manifest.gamePackage.filename) {
        await rm(path.join(targetGameDirectory, entry));
      }
    }

    await copyFile(
      sourceGamePackage,
      path.join(targetGameDirectory, manifest.gamePackage.filename),
    );
    if (this.#config.serverConfig) {
      this.#serverConfigPath = path.join(targetGameDirectory, "q3js-server.cfg");
      await writeFile(
        this.#serverConfigPath,
        `${this.#config.serverConfig}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
    } else {
      await copyFile(
        path.join(this.#config.releaseDirectory, "config", "q3js-defaults.cfg"),
        path.join(targetGameDirectory, "q3js-defaults.cfg"),
      );
    }

    this.#eventConfigPath = path.join(targetGameDirectory, "q3js-events.cfg");
    await writeFile(
      this.#eventConfigPath,
      eventConfigContents(this.#config),
      { encoding: "utf8", mode: 0o600 },
    );
  }

  async #removeRuntimeConfigs(): Promise<void> {
    const configPaths = [this.#eventConfigPath, this.#serverConfigPath]
      .filter((configPath): configPath is string => configPath !== undefined);
    this.#eventConfigPath = undefined;
    this.#serverConfigPath = undefined;
    await Promise.all(configPaths.map((configPath) => rm(configPath, { force: true })));
  }
}
