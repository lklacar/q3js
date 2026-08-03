"use client";

import type { Q3ClientOptions, Q3ClientProgress } from "@q3js/client";
import { ArrowClockwise, Play } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { GameCanvas } from "@/components/game-canvas";
import { Button } from "@/components/ui/button";

const BASE_ASSETS = Array.from({ length: 9 }, (_, index) => ({
  url: `/baseq3/pak${index}.pk3`,
  path: `/baseq3/pak${index}.pk3`,
}));

interface Session {
  playerName: string;
  websocketUrl: string;
  address: string;
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

export function PlayClient() {
  const [playerName, setPlayerName] = useState("Player");
  const [session, setSession] = useState<Session>();
  const [progress, setProgress] = useState<Q3ClientProgress>();
  const [error, setError] = useState<string>();

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
        game: "q3js",
      },
      player: { name: session.playerName },
      assets: BASE_ASSETS,
      onProgress: setProgress,
      onConsole: (_level, message) => console.info(`[Q3JS] ${message}`),
      onError: (clientError) => setError(clientError.message),
    };
  }, [session]);

  const start = () => {
    const host = window.location.hostname || "localhost";
    const websocketProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    setError(undefined);
    setProgress(undefined);
    setSession({
      playerName: playerName.trim() || "Player",
      websocketUrl:
        process.env.NEXT_PUBLIC_Q3JS_WEBSOCKET_URL
        ?? `${websocketProtocol}//${host}:27961/ws`,
      address: process.env.NEXT_PUBLIC_Q3JS_SERVER_ADDRESS ?? `${host}:27961`,
    });
  };

  const stop = () => {
    setSession(undefined);
    setProgress(undefined);
    setError(undefined);
  };

  if (!session || !options) {
    return (
      <section className="border border-border bg-card/40 p-5 md:p-7">
        <div className="max-w-xl">
          <p className="text-[10px] uppercase tracking-wider text-primary">Local match</p>
          <h1 className="mt-2 text-xl font-bold uppercase tracking-tight md:text-2xl">
            Launch Q3JS
          </h1>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            The first launch downloads the base game data into browser storage. Later launches
            reuse the local copy. The Q3JS game package comes directly from the connected server.
          </p>

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
    <section aria-label="Q3JS client">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase text-muted-foreground">
        <span>{progressLabel(progress)}</span>
        <div className="flex items-center gap-3">
          <span>{session.websocketUrl}</span>
          <Button variant="outline" size="xs" onClick={stop}>
            Stop
          </Button>
        </div>
      </div>

      <div className="relative aspect-video min-h-64 overflow-hidden border border-border bg-black">
        <GameCanvas options={options} className="block size-full bg-black" />

        {progress?.phase !== "ready" && !error && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
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
          <div className="absolute inset-0 grid place-items-center bg-black/90 p-6 text-center">
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
      </div>

      <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
        Click the game to focus it. Press Escape to release the mouse.
      </p>
    </section>
  );
}
