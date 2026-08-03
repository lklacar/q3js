import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FILES = new Set(Array.from({ length: 9 }, (_, index) => `pak${index}.pk3`));

interface AssetRouteContext {
  params: Promise<{ filename: string }>;
}

function defaultBasePath(): string {
  const workingDirectory = process.cwd();
  return path.basename(workingDirectory) === "website"
    ? path.resolve(workingDirectory, "../game/server/data")
    : path.resolve(workingDirectory, "game/server/data");
}

async function serveAsset(context: AssetRouteContext, includeBody: boolean): Promise<Response> {
  const { filename } = await context.params;
  if (!ALLOWED_FILES.has(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const basePath = path.resolve(process.env.Q3JS_BASEPATH ?? defaultBasePath());
  const filePath = path.join(basePath, "baseq3", filename);

  try {
    const file = await stat(filePath);
    if (!file.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const headers = {
      "cache-control": "public, max-age=3600",
      "content-length": String(file.size),
      "content-type": "application/octet-stream",
      etag: `W/\"${file.size}-${Math.trunc(file.mtimeMs)}\"`,
    };
    if (!includeBody) {
      return new Response(null, { status: 200, headers });
    }

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
    return new Response(stream, { status: 200, headers });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    if (code === "ENOENT") {
      return new Response("Not found", { status: 404 });
    }
    console.error(`Failed to serve ${filename}:`, error);
    return new Response("Unable to read game asset", { status: 500 });
  }
}

export async function GET(_request: Request, context: AssetRouteContext): Promise<Response> {
  return serveAsset(context, true);
}

export async function HEAD(_request: Request, context: AssetRouteContext): Promise<Response> {
  return serveAsset(context, false);
}
