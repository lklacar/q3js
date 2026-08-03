"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export type Server = {
  id: string;
  name: string;
  map: string;
  mode: string;
  players: number;
  capacity: number;
  ping?: number;
};

export function ServerBrowser({ servers }: { servers: Server[] }) {
  const [query, setQuery] = useState("");
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
            onClick={() => window.location.reload()}
          >
            <ArrowClockwise />
            Refresh
          </Button>
        </div>

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
                  <Button size="lg" className="h-9 px-4 text-xs">Join</Button>
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
                {servers.length === 0 ? "No servers are live" : "No servers match your search"}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                {servers.length === 0
                  ? "The master server connection will appear here as the new backend comes online."
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
