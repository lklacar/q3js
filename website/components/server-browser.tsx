"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { fetchServers, type ListedServer } from "@/lib/master-server";

function joinHref(server: ListedServer): string {
  const parameters = new URLSearchParams({
    host: server.host,
    proxyPort: String(server.proxyPort),
    secure: server.secure ? "1" : "0",
    game: server.game,
    serverName: server.name,
  });
  const insecurePlayUrl = process.env.NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL?.replace(/\/$/, "") ?? "";
  const baseUrl = server.secure ? "" : insecurePlayUrl;
  return `${baseUrl}/play?${parameters.toString()}`;
}

export function ServerBrowser() {
  const [query, setQuery] = useState("");
  const [servers, setServers] = useState<ListedServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const requestRef = useRef<AbortController>(undefined);

  const refresh = useCallback(async () => {
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    setLoading(true);
    setError(undefined);
    try {
      setServers(await fetchServers(request.signal));
    } catch (requestError) {
      if (!request.signal.aborted) {
        setError(requestError instanceof Error ? requestError.message : "Unable to reach the master server");
      }
    } finally {
      if (requestRef.current === request) {
        requestRef.current = undefined;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const request = new AbortController();
    requestRef.current = request;
    fetchServers(request.signal)
      .then((liveServers) => setServers(liveServers))
      .catch((requestError: unknown) => {
        if (!request.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to reach the master server");
        }
      })
      .finally(() => {
        if (requestRef.current === request) {
          requestRef.current = undefined;
          setLoading(false);
        }
      });
    return () => request.abort();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredServers = useMemo(
    () => servers.filter((server) =>
      [server.name, server.map, server.mode].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    ),
    [normalizedQuery, servers],
  );
  const playerCount = servers.reduce((total, server) => total + server.players, 0);

  return (
    <section id="servers" aria-labelledby="servers-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="servers-heading" className="text-lg font-bold uppercase tracking-tight">
            Server browser
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Pick a server to start playing.</p>
        </div>
        <p className="text-right text-[10px] uppercase leading-5 text-muted-foreground">
          {servers.length} servers<br />{playerCount} players
        </p>
      </div>

      <div className="border border-border bg-card/40">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search servers</span>
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search server, map, or mode"
              className="h-9 w-full border border-border bg-input pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </label>
          <Button
            variant="outline"
            size="lg"
            className="h-9 border-border bg-transparent text-xs"
            disabled={loading}
            onClick={() => void refresh()}
          >
            <ArrowClockwise className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>

        {error && (
          <p role="alert" className="border-b border-border px-3 py-2 text-[10px] text-primary">
            {error}. Check that the master server is running, then refresh.
          </p>
        )}

        {filteredServers.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredServers.map((server) => (
              <article key={server.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold">{server.name}</h3>
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                    {server.map} · {server.mode} · {server.ping ? `${server.ping}ms` : "ping pending"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UsersThree className="size-4" />
                    {server.players}/{server.capacity}
                  </span>
                  {server.capacity > 0 && server.players >= server.capacity ? (
                    <Button size="lg" className="h-9 px-4 text-xs" disabled>Full</Button>
                  ) : (
                    <Button asChild size="lg" className="h-9 px-4 text-xs">
                      <Link href={joinHref(server)}>Join</Link>
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto mb-4 grid size-10 place-items-center border border-border text-muted-foreground">
                <UsersThree className="size-5" />
              </span>
              <p className="text-sm font-semibold">
                {loading && servers.length === 0
                  ? "Finding live servers"
                  : servers.length === 0
                    ? "No servers are live"
                    : "No servers match your search"}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                {loading && servers.length === 0
                  ? "Asking the Q3JS master server for the current server list."
                  : servers.length === 0
                    ? "Start a Q3JS server or wait for one to send its next heartbeat."
                    : "Try another server name, map, or game mode."}
              </p>
              {normalizedQuery && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
