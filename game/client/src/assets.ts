import type { Q3EngineModule } from "./runtime/ioquake3.js";
import type {
  Q3Asset,
  Q3ClientOptions,
  Q3ClientProgress,
  Q3PersistenceOptions,
} from "./types.js";

interface PreparedAsset {
  asset: Q3Asset;
  url: URL;
  expectedBytes: number | undefined;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function resolveUrl(value: string | URL, baseUrl?: string | URL): URL {
  if (value instanceof URL) {
    return value;
  }

  const base = baseUrl ?? (typeof document === "undefined" ? undefined : document.baseURI);
  if (!base) {
    return new URL(value);
  }

  return new URL(value, base);
}

function validateVirtualPath(path: string): void {
  if (!path.startsWith("/") || path.split("/").includes("..")) {
    throw new Error(`Asset path must be absolute and cannot contain '..': ${path}`);
  }
}

function parentPath(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator <= 0 ? "/" : path.slice(0, separator);
}

function existingFileSize(module: Q3EngineModule, path: string): number | undefined {
  try {
    return module.FS.stat(path).size;
  } catch {
    return undefined;
  }
}

async function contentLength(url: URL, cache: RequestCache): Promise<number | undefined> {
  try {
    const response = await fetch(url, { method: "HEAD", cache });
    const header = response.headers.get("content-length");
    if (!response.ok || !header) {
      return undefined;
    }

    const value = Number.parseInt(header, 10);
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

async function download(
  url: URL,
  cache: RequestCache,
  onChunk: (bytes: number) => void,
): Promise<Uint8Array> {
  const response = await fetch(url, { cache });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while downloading ${url}`);
  }

  if (!response.body) {
    const result = new Uint8Array(await response.arrayBuffer());
    onChunk(result.byteLength);
    return result;
  }

  const expectedBytes = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(expectedBytes) && expectedBytes >= 0) {
    const result = new Uint8Array(expectedBytes);
    const reader = response.body.getReader();
    let offset = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return offset === result.length ? result : result.slice(0, offset);
      }
      result.set(value, offset);
      offset += value.byteLength;
      onChunk(value.byteLength);
    }
  }

  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    size += value.byteLength;
    onChunk(value.byteLength);
  }

  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export function syncFileSystem(module: Q3EngineModule, populate: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    module.FS.syncfs(populate, (error) => {
      if (error) {
        reject(normalizeError(error));
      } else {
        resolve();
      }
    });
  });
}

function defaultMounts(options: Q3ClientOptions): string[] {
  const mounts = new Set<string>();
  for (const asset of options.assets ?? []) {
    validateVirtualPath(asset.path);
    const root = asset.path.split("/")[1];
    if (root) {
      mounts.add(`/${root}`);
    }
  }

  const homePath = options.game?.homePath ?? "/persist";
  validateVirtualPath(homePath);
  mounts.add(`/${homePath.split("/")[1]}`);

  return [...mounts];
}

function prepareDirectories(module: Q3EngineModule, options: Q3ClientOptions): void {
  for (const asset of options.assets ?? []) {
    validateVirtualPath(asset.path);
    module.FS.mkdirTree(parentPath(asset.path));
  }

  const homePath = options.game?.homePath ?? "/persist";
  validateVirtualPath(homePath);
  const root = homePath.replace(/\/$/, "");
  module.FS.mkdirTree(`${root}/config`);
  module.FS.mkdirTree(`${root}/data`);
  module.FS.mkdirTree(`${root}/state`);
}

export async function preparePersistence(
  module: Q3EngineModule,
  options: Q3ClientOptions,
): Promise<boolean> {
  if (options.persistence === false) {
    prepareDirectories(module, options);
    return false;
  }

  const persistence: Q3PersistenceOptions = options.persistence ?? {};
  const idbfs = module.FS.filesystems?.IDBFS ?? module.IDBFS;
  if (!idbfs) {
    options.onConsole?.("error", "IDBFS is unavailable; continuing without persistence.");
    prepareDirectories(module, options);
    return false;
  }

  const mounts = [...new Set(
    persistence.mounts ? persistence.mounts : defaultMounts(options),
  )];
  for (const mount of mounts) {
    validateVirtualPath(mount);
    module.FS.mkdirTree(mount);
    module.FS.mount(idbfs, { autoPersist: persistence.autoPersist ?? true }, mount);
  }

  if (mounts.length > 0) {
    await syncFileSystem(module, true);
  }
  prepareDirectories(module, options);
  return mounts.length > 0;
}

export async function loadAssets(
  module: Q3EngineModule,
  options: Q3ClientOptions,
  report: (progress: Q3ClientProgress) => void,
): Promise<void> {
  const assets = options.assets ?? [];
  const prepared = await Promise.all(
    assets.map(async (asset): Promise<PreparedAsset> => {
      validateVirtualPath(asset.path);
      const url = resolveUrl(asset.url, options.assetBaseUrl);
      return {
        asset,
        url,
        expectedBytes: await contentLength(url, asset.requestCache ?? "default"),
      };
    }),
  );

  const pending = prepared.filter(({ asset, expectedBytes }) => {
    if (asset.refresh) {
      return true;
    }
    const existingBytes = existingFileSize(module, asset.path);
    return existingBytes === undefined
      || existingBytes <= 0
      || (expectedBytes !== undefined && existingBytes !== expectedBytes);
  });

  let loadedBytes = 0;
  let totalBytes = pending.reduce((total, asset) => total + (asset.expectedBytes ?? 0), 0);
  report({ phase: "loading-assets", loadedBytes, totalBytes });

  for (const { asset, url, expectedBytes } of pending) {
    if (expectedBytes === undefined) {
      const size = await contentLength(url, asset.requestCache ?? "default");
      totalBytes += size ?? 0;
    }

    try {
      const data = await download(url, asset.requestCache ?? "default", (bytes) => {
        loadedBytes += bytes;
        report({
          phase: "loading-assets",
          loadedBytes,
          totalBytes,
          currentAsset: asset.path,
        });
      });
      module.FS.mkdirTree(parentPath(asset.path));
      module.FS.writeFile(asset.path, data);
    } catch (error) {
      if (!asset.optional) {
        throw error;
      }
      options.onConsole?.("error", `Optional asset failed: ${normalizeError(error).message}`);
    }
  }

  report({ phase: "loading-assets", loadedBytes, totalBytes });
}
