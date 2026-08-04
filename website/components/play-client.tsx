"use client";

import type { Q3Asset, Q3ClientOptions, Q3ClientProgress } from "@q3js/client";
import { ArrowClockwise, Play } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameCanvas } from "@/components/game-canvas";
import { Button } from "@/components/ui/button";
import { usePlayerName } from "@/hooks/use-player-name";
import { getRequesterCountry } from "@/lib/api/generated/sdk.gen";
import { client } from "@/lib/api/client";
import type { ClientProfile } from "@/lib/master-server";

const BASE_ASSETS = Array.from({ length: 9 }, (_, index) => ({
  url: `/baseq3/pak${index}.pk3`,
  path: `/baseq3/pak${index}.pk3`,
}));
const CPMA_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pk3$/;

async function assetsForClientProfile(clientProfile: ClientProfile): Promise<readonly Q3Asset[]> {
  if (clientProfile !== "cpma") {
    return BASE_ASSETS;
  }

  const response = await fetch("/cpma/manifest.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load the CPMA asset manifest (HTTP ${response.status}).`);
  }

  const manifest: unknown = await response.json();
  const files = typeof manifest === "object" && manifest !== null && "files" in manifest
    ? (manifest as { files?: unknown }).files
    : undefined;
  if (!Array.isArray(files) || !files.every((file) => typeof file === "string" && CPMA_FILE_PATTERN.test(file))) {
    throw new Error("The CPMA asset manifest is invalid.");
  }
  if (files.length === 0) {
    throw new Error("No CPMA PK3 files are available on the static server.");
  }

  const cpmaAssets = [...new Set(files)].map((filename) => ({
    url: `/cpma/${filename}`,
    path: `/cpma/${filename}`,
  }));
  return [...BASE_ASSETS, ...cpmaAssets];
}

interface Session {
  playerName: string;
  countryCode?: string;
  websocketUrl: string;
  address: string;
  clientProfile: ClientProfile;
  fsGame?: string;
  comGameName: string;
  assets: readonly Q3Asset[];
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
  secure: boolean;
  clientProfile: ClientProfile;
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
        websocketUrl: session.websocketUrl,
        address: session.address,
      },
      game: {
        comBaseGame: "baseq3",
        fsBaseGame: "baseq3",
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
    const clientProfile = selectedServer?.clientProfile ?? "baseq3";
    const fsGame = selectedServer?.fsGame ?? (selectedServer ? undefined : "q3js");
    const comGameName = selectedServer?.comGameName ?? "Quake3Arena";

    let countryCode: string | undefined;
    let assets: readonly Q3Asset[];
    try {
      [countryCode, assets] = await Promise.all([
        requesterCountryCode(),
        assetsForClientProfile(clientProfile),
      ]);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : String(startError));
      return;
    }

    if (selectedServer) {
      const host = selectedServer.host.includes(":") && !selectedServer.host.startsWith("[")
        ? `[${selectedServer.host}]`
        : selectedServer.host;
      const websocketProtocol = selectedServer.secure ? "wss:" : "ws:";
      setSession({
        playerName: playerName.trim() || "Player",
        countryCode,
        websocketUrl: `${websocketProtocol}//${host}:${selectedServer.proxyPort}/ws`,
        address: `${host}:${selectedServer.proxyPort}`,
        clientProfile,
        ...(fsGame ? { fsGame } : {}),
        comGameName,
        assets,
      });
      return;
    }

    const host = window.location.hostname || "localhost";
    const websocketProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    setSession({
      playerName: playerName.trim() || "Player",
      countryCode,
      websocketUrl:
        process.env.NEXT_PUBLIC_Q3JS_WEBSOCKET_URL
        ?? `${websocketProtocol}//${host}:27961/ws`,
      address: process.env.NEXT_PUBLIC_Q3JS_SERVER_ADDRESS ?? `${host}:27961`,
      clientProfile,
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
            {selectedServer?.clientProfile === "cpma"
              ? "The first CPMA launch downloads the base game and CPMA packages into browser storage. Later launches reuse the local copy."
              : "The first launch downloads the base game data into browser storage. Later launches reuse the local copy. The Q3JS game package comes directly from the connected server."}
          </p>
          {selectedServer && (
            <p className="mt-3 text-xs uppercase text-muted-foreground">
              {selectedServer.secure ? "wss" : "ws"}://{selectedServer.host}:{selectedServer.proxyPort}/ws
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
