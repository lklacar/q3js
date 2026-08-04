"use client";

import type { Q3Asset, Q3ClientOptions, Q3ClientProgress } from "@q3js/client";
import { ArrowClockwise, Play } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameCanvas } from "@/components/game-canvas";
import { Button } from "@/components/ui/button";
import { usePlayerName } from "@/hooks/use-player-name";
import { getRequesterCountry } from "@/lib/api/generated/sdk.gen";
import { client } from "@/lib/api/client";

const PK3_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pk3$/;
const STATIC_BASE_URL = (process.env.NEXT_PUBLIC_Q3JS_STATIC_URL?.trim() || "").replace(/\/+$/, "");

function staticUrl(path: string): string {
  return `${STATIC_BASE_URL}/${path}`;
}

async function assetsForDirectory(gameDirectory: string): Promise<readonly Q3Asset[]> {
  const encodedDirectory = encodeURIComponent(gameDirectory);
  const response = await fetch(staticUrl(`${encodedDirectory}/manifest.json`), { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load the ${gameDirectory} asset manifest (HTTP ${response.status}).`);
  }

  const manifest: unknown = await response.json();
  const files = typeof manifest === "object" && manifest !== null && "files" in manifest
    ? (manifest as { files?: unknown }).files
    : undefined;
  if (!Array.isArray(files) || !files.every((file) => typeof file === "string" && PK3_FILE_PATTERN.test(file))) {
    throw new Error(`The ${gameDirectory} asset manifest is invalid.`);
  }
  if (files.length === 0) {
    throw new Error(`No ${gameDirectory} PK3 files are available on the static server.`);
  }

  return [...new Set(files)].map((filename) => ({
    url: staticUrl(`${encodedDirectory}/${encodeURIComponent(filename)}`),
    path: `/${gameDirectory}/${filename}`,
  }));
}

async function assetsForGame(baseGame: string, fsGame: string | undefined): Promise<readonly Q3Asset[]> {
  const directories = [baseGame];
  if (fsGame && fsGame.toLowerCase() !== "q3js" && fsGame !== baseGame) {
    directories.push(fsGame);
  }
  return (await Promise.all(directories.map(assetsForDirectory))).flat();
}

interface Session {
  playerName: string;
  countryCode?: string;
  webtransportUrl: string;
  serverCertificateHashes?: readonly {
    algorithm: "sha-256";
    value: BufferSource;
  }[];
  address: string;
  baseGame: string;
  fsGame?: string;
  comGameName: string;
  assets: readonly Q3Asset[];
}

function certificateHashes(hexValue: string | undefined): Session["serverCertificateHashes"] {
  const hex = (hexValue ?? "").replaceAll(":", "").trim();
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) {
    return undefined;
  }
  return [{
    algorithm: "sha-256",
    value: Uint8Array.from({ length: 32 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)),
  }];
}

function isLocalHost(host: string): boolean {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host.toLowerCase());
}

function localIpv4Host(host: string): string {
  return isLocalHost(host) ? "127.0.0.1" : host;
}

async function localCertificateHashes(host: string, port: number): Promise<Session["serverCertificateHashes"]> {
  const configured = certificateHashes(process.env.NEXT_PUBLIC_Q3JS_WEBTRANSPORT_CERT_SHA256);
  if (configured || !isLocalHost(host)) {
    return configured;
  }
  try {
    const response = await fetch(`http://127.0.0.1:${port}/webtransport.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) {
      return undefined;
    }
    const body = await response.json() as { certificateHash?: unknown };
    return certificateHashes(typeof body.certificateHash === "string" ? body.certificateHash : undefined);
  } catch {
    return undefined;
  }
}

function normalizedWebTransportUrl(value: string): string {
  const url = new URL(value);
  if (isLocalHost(url.hostname)) {
    url.hostname = "127.0.0.1";
  }
  return url.href;
}

async function requesterCountryCode(): Promise<string | undefined> {
  try {
    const { data: country } = await getRequesterCountry({
      client,
      signal: AbortSignal.timeout(2_000),
    });
    const countryCode = country.countryCode?.trim().toUpperCase();
    return countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined;
  } catch {
    return undefined;
  }
}

export interface SelectedServer {
  host: string;
  proxyPort: number;
  targetPort: number;
  baseGame: string;
  fsGame?: string;
  comGameName: string;
  name: string;
}

interface PlayClientProps {
  selectedServer?: SelectedServer;
  initialPlayerName?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 MB";
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function progressLabel(progress: Q3ClientProgress | undefined): string {
  if (!progress) {
    return "Preparing client";
  }
  switch (progress.phase) {
    case "loading-engine":
      return "Loading game engine";
    case "preparing-filesystem":
      return "Opening local game storage";
    case "loading-assets":
      return progress.currentAsset ? `Loading ${progress.currentAsset}` : "Loading game data";
    case "starting":
      return "Starting Quake III";
    case "ready":
      return "Connected";
  }
}

export function PlayClient({ selectedServer, initialPlayerName }: PlayClientProps) {
  const { playerName, setPlayerName } = usePlayerName(initialPlayerName);
  const [session, setSession] = useState<Session>();
  const [progress, setProgress] = useState<Q3ClientProgress>();
  const [error, setError] = useState<string>();
  const [autoStartSuppressed, setAutoStartSuppressed] = useState(false);
  const gameShellRef = useRef<HTMLElement>(null);
  const autoStartRef = useRef(false);

  const toggleFullscreen = useCallback(async () => {
    const target = gameShellRef.current;
    if (!target) {
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await target.requestFullscreen().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    document.documentElement.classList.add("game-page-active");
    document.body.classList.add("game-page-active");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F11") {
        event.preventDefault();
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.documentElement.classList.remove("game-page-active");
      document.body.classList.remove("game-page-active");
    };
  }, [session, toggleFullscreen]);

  const options = useMemo<Omit<Q3ClientOptions, "canvas"> | undefined>(() => {
    if (!session) {
      return undefined;
    }
    return {
      server: {
        webtransportUrl: session.webtransportUrl,
        address: session.address,
        ...(session.serverCertificateHashes
          ? { serverCertificateHashes: session.serverCertificateHashes }
          : {}),
      },
      game: {
        comBaseGame: session.baseGame,
        fsBaseGame: session.baseGame,
        ...(session.fsGame ? { fsGame: session.fsGame } : {}),
        comGameName: session.comGameName,
      },
      player: {
        name: session.playerName,
        countryCode: session.countryCode,
      },
      assets: session.assets,
      onProgress: setProgress,
      onConsole: (_level, message) => console.info(`[Q3JS] ${message}`),
      onError: (clientError) => setError(clientError.message),
    };
  }, [session]);

  const start = useCallback(async () => {
    setError(undefined);
    setProgress(undefined);
    const baseGame = selectedServer?.baseGame ?? "baseq3";
    const fsGame = selectedServer?.fsGame ?? (selectedServer ? undefined : "q3js");
    const comGameName = selectedServer?.comGameName ?? "Quake3Arena";

    let countryCode: string | undefined;
    let assets: readonly Q3Asset[];
    try {
      [countryCode, assets] = await Promise.all([
        requesterCountryCode(),
        assetsForGame(baseGame, fsGame),
      ]);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : String(startError));
      return;
    }

    if (selectedServer) {
      const endpointHost = localIpv4Host(selectedServer.host);
      const host = endpointHost.includes(":") && !endpointHost.startsWith("[")
        ? `[${endpointHost}]`
        : endpointHost;
      const serverCertificateHashes = await localCertificateHashes(
        selectedServer.host,
        selectedServer.proxyPort,
      );
      setSession({
        playerName: playerName.trim() || "Player",
        countryCode,
        webtransportUrl: `https://${host}:${selectedServer.proxyPort}/wt`,
        ...(serverCertificateHashes ? { serverCertificateHashes } : {}),
        address: `${host}:${selectedServer.targetPort}`,
        baseGame,
        ...(fsGame ? { fsGame } : {}),
        comGameName,
        assets,
      });
      return;
    }

    const pageHost = window.location.hostname || "localhost";
    const configuredUrl = process.env.NEXT_PUBLIC_Q3JS_WEBTRANSPORT_URL
      ?? `https://${localIpv4Host(pageHost)}:27961/wt`;
    const webtransportUrl = normalizedWebTransportUrl(configuredUrl);
    const parsedTransportUrl = new URL(webtransportUrl);
    const serverCertificateHashes = await localCertificateHashes(
      parsedTransportUrl.hostname,
      Number.parseInt(parsedTransportUrl.port || "443", 10),
    );
    setSession({
      playerName: playerName.trim() || "Player",
      countryCode,
      webtransportUrl,
      ...(serverCertificateHashes
        ? { serverCertificateHashes }
        : {}),
      address: process.env.NEXT_PUBLIC_Q3JS_SERVER_ADDRESS ?? `${localIpv4Host(pageHost)}:27960`,
      baseGame,
      ...(fsGame ? { fsGame } : {}),
      comGameName,
      assets,
    });
  }, [playerName, selectedServer]);

  const shouldAutoStart = Boolean(selectedServer && initialPlayerName?.trim() && !autoStartSuppressed);

  useEffect(() => {
    if (!shouldAutoStart || autoStartRef.current) {
      return;
    }
    autoStartRef.current = true;
    void start();
  }, [shouldAutoStart, start]);

  const stop = () => {
    const target = gameShellRef.current;
    if (target && document.fullscreenElement && target.contains(document.fullscreenElement)) {
      void document.exitFullscreen().catch(() => undefined);
    }
    setSession(undefined);
    setProgress(undefined);
    setError(undefined);
    setAutoStartSuppressed(true);
  };

  if (!session || !options) {
    if (shouldAutoStart && !error) {
      return (
        <section className="grid size-full place-items-center bg-background p-4 text-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">Joining server</p>
            <p className="mt-2 text-lg font-bold">{selectedServer?.name}</p>
          </div>
        </section>
      );
    }

    return (
      <section className="grid size-full place-items-center overflow-auto bg-background p-4">
        <div className="w-full max-w-xl border border-border bg-card/40 p-5 md:p-7">
          <p className="text-xs uppercase tracking-wider text-primary">
            {selectedServer ? "Selected server" : "Local match"}
          </p>
          <h1 className="mt-2 text-2xl font-bold uppercase tracking-tight md:text-3xl">
            {selectedServer ? selectedServer.name : "Launch Q3JS"}
          </h1>
          <p className="mt-3 text-sm leading-5 text-muted-foreground">
            The first launch downloads the required game packages into browser storage. Later launches reuse the local copy.
          </p>
          {selectedServer && (
            <p className="mt-3 text-xs uppercase text-muted-foreground">
              https://{selectedServer.host}:{selectedServer.proxyPort}/wt
            </p>
          )}

          {error && (
            <p role="alert" className="mt-4 border-l-2 border-primary pl-3 text-sm leading-5 text-primary">
              {error}
            </p>
          )}

          <label className="mt-6 block text-xs uppercase text-muted-foreground">
            Player name
            <input
              value={playerName}
              maxLength={32}
              onChange={(event) => setPlayerName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void start();
                }
              }}
              className="mt-2 h-10 w-full border border-border bg-input px-3 text-base text-foreground focus:border-ring focus:outline-none"
            />
          </label>

          <Button size="lg" className="mt-4" onClick={() => void start()}>
            <Play weight="fill" />
            Start game
          </Button>
        </div>
      </section>
    );
  }

  const loadedBytes = progress?.loadedBytes ?? 0;
  const totalBytes = progress?.totalBytes ?? 0;
  const percent = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;

  return (
    <section
      ref={gameShellRef}
      aria-label="Q3JS client"
      className="absolute inset-0 size-full overflow-hidden bg-black"
    >
      <GameCanvas
        options={options}
        className="absolute inset-0 block size-full bg-black outline-none"
      />

      {progress?.phase !== "ready" && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/85 p-6 text-center">
          <div className="w-full max-w-md">
            <p className="text-base font-semibold">{progressLabel(progress)}</p>
            <div className="mt-4 h-1 w-full bg-muted">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
            </div>
            {totalBytes > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {formatBytes(loadedBytes)} / {formatBytes(totalBytes)}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/90 p-6 text-center">
          <div className="max-w-lg">
            <p className="text-base font-semibold text-primary">Unable to start Q3JS</p>
            <p className="mt-2 break-words text-sm leading-5 text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={stop}>
              <ArrowClockwise />
              Try again
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
