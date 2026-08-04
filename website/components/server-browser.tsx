"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowClockwise,
  DiceFive,
  LockKey,
  MagnifyingGlass,
  SealCheck,
  Users,
} from "@phosphor-icons/react";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { QueryBoundary } from "@/components/query-boundary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlayerName } from "@/hooks/use-player-name";
import type { ListedServer } from "@/lib/master-server";
import { masterServerQueryOptions } from "@/lib/master-server-query";

type ServerFilter = "active" | "all" | "open";

function joinHref(server: ListedServer, playerName: string): string {
  const parameters = new URLSearchParams({
    host: server.host,
    proxyPort: String(server.proxyPort),
    secure: server.secure ? "1" : "0",
    game: server.game,
    serverName: server.name,
    name: playerName.trim() || "Player",
  });
  const insecurePlayUrl = process.env.NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL?.replace(/\/$/, "") ?? "";
  return `${server.secure ? "" : insecurePlayUrl}/play?${parameters.toString()}`;
}

function isOpen(server: ListedServer): boolean {
  return server.capacity === 0 || server.players < server.capacity;
}

function occupancy(server: ListedServer): number {
  return server.capacity > 0 ? Math.min(100, (server.players / server.capacity) * 100) : 0;
}

function countLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function pingColor(ping: number): string {
  if (ping <= 0) return "text-muted-foreground";
  if (ping < 50) return "text-green-500";
  if (ping < 100) return "text-yellow-500";
  return "text-primary";
}

function Metadata({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span className="inline-flex min-h-6 items-center gap-1.5 border border-border/60 px-2 font-mono text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function PlayerNameDialog({
  onOpenChange,
  open,
  server,
}: Readonly<{
  onOpenChange: (open: boolean) => void;
  open: boolean;
  server?: ListedServer;
}>) {
  const { playerName, randomizePlayerName, setPlayerName } = usePlayerName();

  const join = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!server) return;

    const name = playerName.trim() || "Player";
    setPlayerName(name);
    window.location.assign(joinHref(server, name));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join server</DialogTitle>
          <DialogDescription>
            Choose your player name before joining <span className="font-semibold text-foreground">{server?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={join}>
          <label htmlFor="join-player-name" className="block font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Player name
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="join-player-name"
              autoFocus
              required
              maxLength={32}
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Enter your player name"
              className="h-10 min-w-0 flex-1 border border-border bg-input px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={randomizePlayerName}
              aria-label="Generate a random player name"
            >
              <DiceFive />
            </Button>
          </div>

          <DialogFooter className="mt-5">
            <Button type="submit" size="lg" className="w-full" disabled={!server}>
              Join arena
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServerCard({ onJoin, server }: Readonly<{
  onJoin: (server: ListedServer) => void;
  server: ListedServer;
}>) {
  return (
    <article className={`arena-card border ${server.official ? "border-primary/60 bg-card/80" : "border-border/60 bg-card/50"}`}>
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="break-words font-mono text-2xl font-bold tracking-[0.025em]">
                <Q3ColoredText text={server.coloredName} />
              </h3>
              {server.official && (
                <span className="inline-flex shrink-0 items-center gap-1 border border-primary/50 bg-primary/10 px-2 py-1 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                  <SealCheck className="size-4" weight="fill" aria-hidden="true" />
                  Official
                </span>
              )}
              {server.passwordProtected && <LockKey className="size-4 text-muted-foreground" aria-label="Password required" />}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{server.host}:{server.targetPort}</p>
          </div>
          {isOpen(server) ? (
            <Button size="lg" className="sm:self-start" onClick={() => onJoin(server)}>
              Join arena
            </Button>
          ) : (
            <Button size="lg" className="sm:self-start" disabled>Server full</Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Metadata>{server.map.toUpperCase()}</Metadata>
          <Metadata>{server.mode}</Metadata>
          <Metadata>{server.limits}</Metadata>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-mono">{server.players}/{server.capacity || "—"}</span>
            <div className="h-1.5 w-24 overflow-hidden bg-secondary" aria-hidden="true">
              <div className="h-full bg-primary" style={{ width: `${occupancy(server)}%` }} />
            </div>
            <span className="text-muted-foreground">players</span>
          </div>
          <span className={`font-mono ${pingColor(server.ping)}`}>
            {server.ping > 0 ? `${server.ping} ms` : "Ping pending"}
          </span>
        </div>

        <div className="mt-5 border-t border-border/50 pt-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            <span className="font-semibold text-foreground">Players ({server.users.length})</span>
          </div>
          <ScrollArea className="h-40 overflow-y-auto rounded-md border border-border/40 bg-background/40">
            <div className="grid grid-cols-[4rem_4rem_minmax(0,1fr)] border-b border-border/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              <span>Score</span>
              <span>Ping</span>
              <span>Name</span>
            </div>
            {server.users.length ? (
              server.users.map((player, index) => (
                <div
                  key={`${player.name}-${index}`}
                  className="grid grid-cols-[4rem_4rem_minmax(0,1fr)] px-3 py-1.5 font-mono text-[11px] text-foreground odd:bg-background/40"
                >
                  <span className="tabular-nums">{player.score}</span>
                  <span className="tabular-nums">{player.ping}</span>
                  <Link
                    href={`/players/${encodeURIComponent(player.name)}`}
                    className="min-w-0 truncate transition-opacity hover:opacity-80"
                  >
                    <Q3ColoredText text={player.name} className="block truncate" />
                  </Link>
                </div>
              ))
            ) : (
              <p className="flex h-28 items-center justify-center px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Waiting for players
              </p>
            )}
          </ScrollArea>
        </div>
      </div>

    </article>
  );
}

function FilterButton({ active, children, onClick }: Readonly<{
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}>) {
  return (
    <Button variant={active ? "secondary" : "ghost"} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}

function BrowserHeading({ serverCount, playerCount, pending = false }: Readonly<{
  serverCount?: number;
  playerCount?: number;
  pending?: boolean;
}>) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-primary">02 / Live arenas</p>
        <h2 id="servers-heading" className="font-mono text-2xl font-bold uppercase tracking-[0.035em] md:text-3xl">Server browser</h2>
        <p className="mt-2 text-base text-muted-foreground">Choose your arena and join the fight.</p>
      </div>
      {serverCount !== undefined && (
        <p className="shrink-0 text-right font-mono text-xs leading-5 text-muted-foreground">
          {countLabel(serverCount, "server")}<br />
          {countLabel(playerCount ?? 0, "player")} online
        </p>
      )}
      {pending && (
        <div className="w-20 shrink-0 space-y-2" aria-hidden="true">
          <Skeleton className="ml-auto h-2 w-14" />
          <Skeleton className="ml-auto h-2 w-20 bg-muted/70" />
        </div>
      )}
    </div>
  );
}

function ServerBrowserQuery() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ServerFilter>("all");
  const [selectedServer, setSelectedServer] = useState<ListedServer>();
  const { data: servers, error, isFetching, refetch } = useSuspenseQuery(masterServerQueryOptions());
  // Keep the first meaningful server order for this visit. The master sorts by
  // live player count, which would otherwise reshuffle whole cards every poll.
  const [serverOrder] = useState<ReadonlyMap<string, number>>(
    () => new Map(servers.map((server, index) => [server.id, index])),
  );

  const orderedServers = useMemo(() => {
    return [...servers].sort((left, right) => {
      const leftOrder = serverOrder.get(left.id);
      const rightOrder = serverOrder.get(right.id);

      if (leftOrder !== undefined && rightOrder !== undefined) return leftOrder - rightOrder;
      if (leftOrder !== undefined) return -1;
      if (rightOrder !== undefined) return 1;
      return left.id.localeCompare(right.id);
    });
  }, [serverOrder, servers]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredServers = useMemo(
    () => orderedServers.filter((server) => {
      if (filter === "active" && server.players === 0) return false;
      if (filter === "open" && !isOpen(server)) return false;
      if (!normalizedQuery) return true;

      return [server.name, server.map, server.mode, server.host, ...server.users.map((player) => player.name)]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    }),
    [filter, normalizedQuery, orderedServers],
  );
  const playerCount = servers.reduce((total, server) => total + server.players, 0);
  const openServer = servers.find(isOpen);

  return (
    <section id="servers" aria-labelledby="servers-heading" className="scroll-mt-20">
      <BrowserHeading serverCount={servers.length} playerCount={playerCount} />

      <div className="mt-6 border border-border/60 bg-card/60 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative min-w-0">
            <span className="sr-only">Search servers</span>
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search server, map, or player"
              className="h-10 w-full border border-border bg-input pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </label>

          <div className="flex gap-2">
            {openServer && (
              <Button size="lg" className="h-10 flex-1 px-4 lg:flex-none" onClick={() => setSelectedServer(openServer)}>
                Quick play
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-lg"
              className="size-10 bg-transparent"
              disabled={isFetching}
              onClick={() => void refetch()}
              aria-label="Refresh server list"
            >
              <ArrowClockwise className={isFetching ? "animate-spin" : undefined} />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All</FilterButton>
          <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>With players</FilterButton>
          <FilterButton active={filter === "open"} onClick={() => setFilter("open")}>Open slots</FilterButton>
          <span className="ml-auto font-mono text-xs text-muted-foreground">{filteredServers.length} shown</span>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="fixed bottom-4 left-4 right-4 z-50 border border-primary/60 bg-background px-4 py-3 text-sm text-primary shadow-lg sm:left-auto sm:max-w-md"
        >
          Refresh failed: {error.message}. Showing cached results.
        </p>
      )}

      {filteredServers.length ? (
        <div className="mt-5 grid gap-4">
          {filteredServers.map((server) => (
            <ServerCard key={server.id} onJoin={setSelectedServer} server={server} />
          ))}
        </div>
      ) : (
        <div className="mt-5 border border-border/60 bg-card/50 px-6 py-12 text-center">
          <p className="text-base font-semibold">
            {servers.length === 0 ? "No servers are live right now." : "No servers match your filters."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {servers.length === 0 ? "Refresh the list or run your own server." : "Change the search or filter and try again."}
          </p>
          {(normalizedQuery || filter !== "all") && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQuery(""); setFilter("all"); }}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      <PlayerNameDialog
        open={selectedServer !== undefined}
        server={selectedServer}
        onOpenChange={(open) => {
          if (!open) setSelectedServer(undefined);
        }}
      />
    </section>
  );
}

function ServerBrowserPending() {
  return (
    <section id="servers" aria-labelledby="servers-heading" aria-busy="true">
      <BrowserHeading pending />

      <div className="mt-6 border border-border/60 bg-card/60 p-4" aria-hidden="true">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative flex h-10 items-center border border-border bg-input pl-9 pr-3 text-sm text-muted-foreground">
            <MagnifyingGlass className="absolute left-3 size-4" />
            Search server, map, or player
          </div>
          <div className="flex gap-2">
            <Button size="lg" className="h-10 flex-1 px-4 lg:flex-none" disabled>Quick play</Button>
            <Button variant="outline" size="icon-lg" className="size-10 bg-transparent" disabled>
              <ArrowClockwise className="animate-spin" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <Button variant="secondary" size="sm" disabled>All</Button>
          <Button variant="ghost" size="sm" disabled>With players</Button>
          <Button variant="ghost" size="sm" disabled>Open slots</Button>
          <span className="ml-auto flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="size-1.5 bg-primary motion-safe:animate-pulse" /> Syncing arenas
          </span>
        </div>
      </div>

      <article className="arena-card mt-5 border border-border/60 bg-card/50" aria-hidden="true">
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-44 max-w-[70%]" />
              <Skeleton className="mt-2 h-2 w-28 bg-muted/70" />
            </div>
            <Button size="lg" disabled>Join arena</Button>
          </div>

          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-16 bg-muted/70" />
            <Skeleton className="h-6 w-24 bg-muted/70" />
            <Skeleton className="h-6 w-28 bg-muted/70" />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-1.5 w-24 bg-muted/70" />
            <span className="text-sm text-muted-foreground">players</span>
            <Skeleton className="ml-3 h-3 w-10" />
          </div>

          <div className="mt-5 border-t border-border/50 pt-4">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] px-3 pb-2 font-mono text-xs uppercase text-muted-foreground">
              <span>Players</span>
              <span className="text-right">Score</span>
              <span className="text-right">Ping</span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center bg-background/25 px-3 py-2.5">
              <Skeleton className="h-3 w-32 max-w-[75%]" />
              <Skeleton className="ml-auto h-3 w-5" />
              <Skeleton className="ml-auto h-3 w-8" />
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

function ServerBrowserError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <section id="servers" aria-labelledby="servers-heading">
      <BrowserHeading />
      <div className="mt-6 border border-border/60 bg-card/50 px-6 py-12 text-center">
        <p role="alert" className="text-base font-semibold">Master server unavailable.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
          <ArrowClockwise /> Try again
        </Button>
      </div>
    </section>
  );
}

export function ServerBrowser() {
  return (
    <QueryBoundary
      pendingFallback={<ServerBrowserPending />}
      errorFallback={(props) => <ServerBrowserError {...props} />}
    >
      <ServerBrowserQuery />
    </QueryBoundary>
  );
}
