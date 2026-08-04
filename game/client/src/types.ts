export type Q3ClientPhase =
  | "loading-engine"
  | "preparing-filesystem"
  | "loading-assets"
  | "starting"
  | "ready";

export interface Q3ClientProgress {
  phase: Q3ClientPhase;
  loadedBytes: number;
  totalBytes: number;
  currentAsset?: string;
}

export interface Q3Asset {
  /** URL relative to assetBaseUrl, or an absolute URL. */
  url: string | URL;
  /** Absolute path in the Quake virtual filesystem. */
  path: string;
  optional?: boolean;
  refresh?: boolean;
  requestCache?: RequestCache;
}

export interface Q3GameOptions {
  comBaseGame?: string;
  fsBaseGame?: string;
  fsGame?: string;
  /** Engine identity sent during the server challenge, for example Quake3Arena or spaitial. */
  comGameName?: string;
  homePath?: string;
}

export interface Q3PlayerOptions {
  name?: string;
  /** Two-letter ISO country code exposed to the game through userinfo. */
  countryCode?: string;
}

export interface Q3ServerOptions {
  websocketUrl: string;
  address?: string;
  subprotocol?: string;
}

export interface Q3PersistenceOptions {
  /** IndexedDB mount points. Defaults to asset roots and homePath. */
  mounts?: readonly string[];
  autoPersist?: boolean;
}

export type Q3CvarValue = string | number | boolean;

export interface Q3ClientOptions {
  canvas: HTMLCanvasElement;
  game?: Q3GameOptions;
  player?: Q3PlayerOptions;
  server?: Q3ServerOptions;
  assets?: readonly Q3Asset[];
  assetBaseUrl?: string | URL;
  wasmUrl?: string | URL;
  cvars?: Readonly<Record<string, Q3CvarValue>>;
  additionalArguments?: readonly string[];
  /** Enabled by default. Set to false to keep all files in memory. */
  persistence?: false | Q3PersistenceOptions;
  onProgress?: (progress: Q3ClientProgress) => void;
  onReady?: (client: import("./client.js").Q3Client) => void;
  onConsole?: (level: "info" | "error", message: string) => void;
  onError?: (error: Error) => void;
}

export interface Q3FileSystem {
  filesystems?: { IDBFS?: unknown };
  mkdirTree(path: string): void;
  mount(type: unknown, options: Record<string, unknown>, mountpoint: string): unknown;
  readFile(path: string, options?: { encoding?: "utf8" }): Uint8Array | string;
  readdir(path: string): string[];
  rename(oldPath: string, newPath: string): void;
  stat(path: string): { mode: number; size: number };
  syncfs(populate: boolean, callback: (error: unknown) => void): void;
  unlink(path: string): void;
  writeFile(path: string, data: string | ArrayBufferView): void;
}
