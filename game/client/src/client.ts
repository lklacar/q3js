import { loadAssets, preparePersistence, syncFileSystem } from "./assets.js";
import type { Q3EngineModule, Q3EngineModuleOptions } from "./runtime/ioquake3.js";
import type {
  Q3ClientOptions,
  Q3ClientProgress,
  Q3CvarValue,
  Q3FileSystem,
} from "./types.js";

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function resolveUrl(value: string | URL): string {
  if (value instanceof URL) {
    return value.href;
  }
  return new URL(value, document.baseURI).href;
}

function safeValue(value: Q3CvarValue): string {
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  return String(value).replace(/[\u0000-\u001f\u007f"\\;]/g, "");
}

function addSet(arguments_: string[], name: string, value: Q3CvarValue | undefined): void {
  if (value === undefined) {
    return;
  }
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Invalid cvar name: ${name}`);
  }
  arguments_.push("+set", name, safeValue(value));
}

interface RenderSize {
  width: number;
  height: number;
}

export function buildQ3Arguments(
  options: Omit<Q3ClientOptions, "canvas">,
  renderSize?: RenderSize,
): string[] {
  const arguments_: string[] = [];
  const baseGame = options.game?.baseGame ?? "baseq3";
  const homePath = options.game?.homePath ?? "/persist";

  addSet(arguments_, "sv_pure", 0);
  addSet(arguments_, "r_mode", renderSize ? -1 : -2);
  addSet(arguments_, "r_customwidth", renderSize?.width);
  addSet(arguments_, "r_customheight", renderSize?.height);
  addSet(arguments_, "r_fullscreen", 0);
  addSet(arguments_, "com_introplayed", 1);
  addSet(arguments_, "com_basegame", baseGame);
  addSet(arguments_, "fs_basegame", baseGame);
  addSet(arguments_, "fs_game", options.game?.game);
  addSet(arguments_, "name", options.player?.name ?? "Player");
  addSet(arguments_, "cl_allowDownload", 1);

  const homeRoot = homePath.replace(/\/$/, "");
  addSet(arguments_, "fs_homeconfigpath", `${homeRoot}/config`);
  addSet(arguments_, "fs_homedatapath", `${homeRoot}/data`);
  addSet(arguments_, "fs_homestatepath", `${homeRoot}/state`);

  if (options.server) {
    addSet(arguments_, "net_enabled", 1);
  }

  for (const [name, value] of Object.entries(options.cvars ?? {})) {
    addSet(arguments_, name, value);
  }

  arguments_.push(...(options.additionalArguments ?? []));
  if (options.server?.address) {
    arguments_.push("+connect", safeValue(options.server.address));
  }
  return arguments_;
}

export class Q3Client {
  readonly filesystem: Q3FileSystem;
  readonly canvas: HTMLCanvasElement;
  readonly persistent: boolean;

  readonly #runtime: Q3EngineModule;
  #disposed = false;
  #mobileInitialized = false;

  constructor(runtime: Q3EngineModule, canvas: HTMLCanvasElement, persistent: boolean) {
    this.#runtime = runtime;
    this.filesystem = runtime.FS;
    this.canvas = canvas;
    this.persistent = persistent;
  }

  resize(width: number, height: number, scale = 1): void {
    const nextWidth = Math.max(1, Math.round(width * scale));
    const nextHeight = Math.max(1, Math.round(height * scale));
    if (this.canvas.width !== nextWidth) {
      this.canvas.width = nextWidth;
    }
    if (this.canvas.height !== nextHeight) {
      this.canvas.height = nextHeight;
    }
  }

  mobileKey(key: number, down: boolean): void {
    this.#initializeMobileInput();
    this.#runtime._Q3JS_MobileKeyEvent?.(key, down ? 1 : 0);
  }

  mobileMouseMove(deltaX: number, deltaY: number): void {
    this.#initializeMobileInput();
    this.#runtime._Q3JS_MobileMouseMove?.(Math.round(deltaX), Math.round(deltaY));
  }

  mobileJoystickAxis(axis: number, value: number): void {
    this.#initializeMobileInput();
    this.#runtime._Q3JS_MobileJoystickAxis?.(axis, Math.round(value));
  }

  async sync(): Promise<void> {
    if (this.persistent && !this.#disposed) {
      await syncFileSystem(this.#runtime, false);
    }
  }

  async dispose(): Promise<void> {
    if (this.#disposed) {
      return;
    }
    try {
      await this.sync();
    } finally {
      this.#disposed = true;
      this.#runtime._Q3JS_RequestQuit?.();
    }
  }

  #initializeMobileInput(): void {
    if (!this.#mobileInitialized) {
      this.#runtime._Q3JS_MobileInitBindings?.();
      this.#mobileInitialized = true;
    }
  }
}

export async function createQ3Client(options: Q3ClientOptions): Promise<Q3Client> {
  const report = (progress: Q3ClientProgress): void => options.onProgress?.(progress);

  try {
    report({ phase: "loading-engine", loadedBytes: 0, totalBytes: 0 });
    const { default: createEngine } = await import("./runtime/ioquake3.js");

    const engineOptions: Q3EngineModuleOptions = {
      canvas: options.canvas,
      elementPointerLock: true,
      noInitialRun: true,
    };

    if (options.server) {
      engineOptions.websocket = {
        url: options.server.websocketUrl,
        subprotocol: options.server.subprotocol ?? "binary",
      };
    }
    if (options.wasmUrl) {
      const wasmUrl = resolveUrl(options.wasmUrl);
      engineOptions.locateFile = (path, prefix) => path.endsWith(".wasm") ? wasmUrl : `${prefix}${path}`;
    }
    if (options.onConsole) {
      engineOptions.print = (message) => options.onConsole?.("info", message);
      engineOptions.printErr = (message) => options.onConsole?.("error", message);
    }
    let abortError: Error | undefined;
    engineOptions.onAbort = (reason) => {
      abortError = normalizeError(reason);
    };

    const runtime = await createEngine(engineOptions);
    if (abortError) {
      throw abortError;
    }

    report({ phase: "preparing-filesystem", loadedBytes: 0, totalBytes: 0 });
    const persistent = await preparePersistence(runtime, options);
    await loadAssets(runtime, options, report);
    if (persistent) {
      await syncFileSystem(runtime, false);
    }

    report({ phase: "starting", loadedBytes: 0, totalBytes: 0 });
    const client = new Q3Client(runtime, options.canvas, persistent);
    const bounds = options.canvas.getBoundingClientRect();
    const renderSize = {
      width: Math.max(1, Math.round(bounds.width || window.innerWidth)),
      height: Math.max(1, Math.round(bounds.height || window.innerHeight)),
    };
    runtime.callMain(buildQ3Arguments(options, renderSize));
    report({ phase: "ready", loadedBytes: 0, totalBytes: 0 });
    options.onReady?.(client);
    return client;
  } catch (error) {
    const normalized = normalizeError(error);
    options.onError?.(normalized);
    throw normalized;
  }
}
