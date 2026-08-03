"use client";

import type { Q3ClientOptions, Q3ClientProgress } from "@q3js/client";
import { ArrowsOut, ArrowClockwise, Play, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameCanvas } from "@/components/game-canvas";
import { Button } from "@/components/ui/button";
import { usePlayerName } from "@/hooks/use-player-name";

const BASE_ASSETS = Array.from({ length: 9 }, (_, index) => ({
  url: `/baseq3/pak${index}.pk3`,
  path: `/baseq3/pak${index}.pk3`,
}));

interface Session {
  playerName: string;
  websocketUrl: string;
  address: string;
  game: string;
}

export interface SelectedServer {
  host: string;
  proxyPort: number;
  secure: boolean;
  game: string;
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
  const [mouseCaptured, setMouseCaptured] = useState(false);
  const gameShellRef = useRef<HTMLElement>(null);

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
        baseGame: "baseq3",
        game: session.game,
      },
      player: { name: session.playerName },
      assets: BASE_ASSETS,
      onProgress: setProgress,
      onConsole: (_level, message) => console.info(`[Q3JS] ${message}`),
      onError: (clientError) => setError(clientError.message),
    };
  }, [session]);

  const start = () => {
    setError(undefined);
    setProgress(undefined);

    if (selectedServer) {
      const host = selectedServer.host.includes(":") && !selectedServer.host.startsWith("[")
        ? `[${selectedServer.host}]`
        : selectedServer.host;
      const websocketProtocol = selectedServer.secure ? "wss:" : "ws:";
      setSession({
        playerName: playerName.trim() || "Player",
        websocketUrl: `${websocketProtocol}//${host}:${selectedServer.proxyPort}/ws`,
        address: `${host}:${selectedServer.proxyPort}`,
        game: selectedServer.game,
      });
      return;
    }

    const host = window.location.hostname || "localhost";
    const websocketProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    setSession({
      playerName: playerName.trim() || "Player",
      websocketUrl:
        process.env.NEXT_PUBLIC_Q3JS_WEBSOCKET_URL
        ?? `${websocketProtocol}//${host}:27961/ws`,
      address: process.env.NEXT_PUBLIC_Q3JS_SERVER_ADDRESS ?? `${host}:27961`,
      game: "q3js",
    });
  };

  const stop = () => {
    const target = gameShellRef.current;
    if (target && document.fullscreenElement && target.contains(document.fullscreenElement)) {
      void document.exitFullscreen().catch(() => undefined);
    }
    setSession(undefined);
    setProgress(undefined);
    setError(undefined);
    setMouseCaptured(false);
  };

  if (!session || !options) {
    return (
      <section className="grid size-full place-items-center overflow-auto bg-background p-4">
        <div className="w-full max-w-xl border border-border bg-card/40 p-5 md:p-7">
          <p className="text-[10px] uppercase tracking-wider text-primary">
            {selectedServer ? "Selected server" : "Local match"}
          </p>
          <h1 className="mt-2 text-xl font-bold uppercase tracking-tight md:text-2xl">
            {selectedServer ? selectedServer.name : "Launch Q3JS"}
          </h1>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            The first launch downloads the base game data into browser storage. Later launches
            reuse the local copy. The Q3JS game package comes directly from the connected server.
          </p>
          {selectedServer && (
            <p className="mt-3 text-[10px] uppercase text-muted-foreground">
              {selectedServer.secure ? "wss" : "ws"}://{selectedServer.host}:{selectedServer.proxyPort}/ws
            </p>
          )}

          <label className="mt-6 block text-[10px] uppercase text-muted-foreground">
            Player name
            <input
              value={playerName}
              maxLength={32}
              onChange={(event) => setPlayerName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  start();
                }
              }}
              className="mt-2 h-10 w-full border border-border bg-input px-3 text-sm text-foreground focus:border-ring focus:outline-none"
            />
          </label>

          <Button size="lg" className="mt-4" onClick={start}>
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
        onPointerLockChange={setMouseCaptured}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-black/75 to-transparent p-3 text-[10px] uppercase text-white/70">
        <div>
          <p>{progressLabel(progress)}</p>
          {progress?.phase === "ready" && (
            <p className="mt-1 text-white/45">
              {mouseCaptured ? "Mouse captured · Escape to release" : "Click the game to capture the mouse"}
            </p>
          )}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void toggleFullscreen()}>
            <ArrowsOut />
            Fullscreen
          </Button>
          <Button variant="secondary" size="sm" onClick={stop}>
            <X />
            Exit
          </Button>
        </div>
      </div>

      {progress?.phase !== "ready" && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/85 p-6 text-center">
          <div className="w-full max-w-md">
            <p className="text-sm font-semibold">{progressLabel(progress)}</p>
            <div className="mt-4 h-1 w-full bg-muted">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
            </div>
            {totalBytes > 0 && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                {formatBytes(loadedBytes)} / {formatBytes(totalBytes)}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/90 p-6 text-center">
          <div className="max-w-lg">
            <p className="text-sm font-semibold text-primary">Unable to start Q3JS</p>
            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">{error}</p>
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
